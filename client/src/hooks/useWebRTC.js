import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

const ICE_SERVERS = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
    ]
};

export function useWebRTC() {
    const [localStream, setLocalStream] = useState(null);
    const [remoteStream, setRemoteStream] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const [micOn, setMicOn] = useState(true);
    const [cameraOn, setCameraOn] = useState(true);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [socket, setSocket] = useState(null);
    const [messages, setMessages] = useState([]);

    const peerConnectionRef = useRef(null);
    const originalVideoTrackRef = useRef(null);

    useEffect(() => {
        // Connect to signaling server: uses Vite env variable deployed on Vercel, or localhost for local dev
        const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
        const newSocket = io(backendUrl);
        setSocket(newSocket);

        return () => {
            newSocket.disconnect();
        };
    }, []);

    const initializeMedia = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            setLocalStream(stream);
            originalVideoTrackRef.current = stream.getVideoTracks()[0];
            return stream;
        } catch (err) {
            console.error("Error accessing media devices.", err);
            // Fallback for no camera/mic
            alert("Could not access camera/microphone.");
            return null;
        }
    };

    const createPeerConnection = (sigSocket, stream, roomId) => {
        const pc = new RTCPeerConnection(ICE_SERVERS);

        // Add local tracks
        if (stream) {
            stream.getTracks().forEach(track => {
                pc.addTrack(track, stream);
            });
        }

        // Handle remote track
        pc.ontrack = (event) => {
            console.log("Received remote track", event.streams[0]);
            setRemoteStream(event.streams[0]);
        };

        // Handle ICE candidates
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                sigSocket.emit('ice-candidate', event.candidate, roomId);
            }
        };

        peerConnectionRef.current = pc;
        return pc;
    };

    const joinRoom = useCallback(async (roomId) => {
        if (!socket) return;

        const stream = await initializeMedia();
        const pc = createPeerConnection(socket, stream, roomId);

        // Socket Event Listeners
        socket.emit('join-room', roomId, socket.id);

        socket.on('user-connected', async (userId) => {
            console.log('User connected:', userId);
            // Create offer
            try {
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                socket.emit('offer', offer, roomId);
            } catch (err) {
                console.error('Error creating offer', err);
            }
        });

        socket.on('offer', async (offer, fromId) => {
            console.log('Received offer', offer);
            try {
                await pc.setRemoteDescription(new RTCSessionDescription(offer));
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                socket.emit('answer', answer, roomId);
            } catch (err) {
                console.error('Error handling offer', err);
            }
        });

        socket.on('answer', async (answer) => {
            console.log('Received answer', answer);
            try {
                if (!pc.currentRemoteDescription) {
                    await pc.setRemoteDescription(new RTCSessionDescription(answer));
                }
            } catch (err) {
                console.error('Error handling answer', err);
            }
        });

        socket.on('ice-candidate', async (candidate) => {
            try {
                if (pc.remoteDescription) {
                    await pc.addIceCandidate(new RTCIceCandidate(candidate));
                }
            } catch (err) {
                console.error('Error adding ICE candidate', err);
            }
        });

        socket.on('chat-message', (message) => {
            setMessages(prev => [...prev, { text: message, sender: 'remote' }]);
        });

        socket.on('user-disconnected', () => {
            console.log('Remote user disconnected');
            setRemoteStream(null);
        });

        setIsConnected(true);
    }, [socket]);

    const sendMessage = (roomId, text) => {
        if (socket && text.trim()) {
            socket.emit('chat-message', text, roomId);
            setMessages(prev => [...prev, { text, sender: 'local' }]);
        }
    };

    const leaveRoom = () => {
        if (peerConnectionRef.current) {
            peerConnectionRef.current.close();
            peerConnectionRef.current = null;
        }
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
            setLocalStream(null);
        }
        setRemoteStream(null);
        setIsConnected(false);
        setMessages([]);
        setIsScreenSharing(false);
    };

    const toggleMic = () => {
        if (localStream) {
            const audioTrack = localStream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setMicOn(audioTrack.enabled);
            }
        }
    };

    const toggleCamera = () => {
        if (localStream && !isScreenSharing) {
            const videoTrack = originalVideoTrackRef.current;
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                setCameraOn(videoTrack.enabled);
            }
        }
    };

    const toggleScreenSharing = async () => {
        if (!peerConnectionRef.current) return;

        if (isScreenSharing) {
            // Stop screen sharing, swap back to camera
            try {
                const senders = peerConnectionRef.current.getSenders();
                const videoSender = senders.find(s => s.track && s.track.kind === 'video');

                if (videoSender && originalVideoTrackRef.current) {
                    // Reactivate camera if it was on
                    originalVideoTrackRef.current.enabled = cameraOn;
                    await videoSender.replaceTrack(originalVideoTrackRef.current);

                    // Stop the screen sharing tracks locally
                    localStream.getVideoTracks().forEach(track => {
                        if (track !== originalVideoTrackRef.current) track.stop();
                    });

                    // Restore the stream in the local <video> element
                    const audioTrack = localStream.getAudioTracks()[0];
                    const newStream = new MediaStream([originalVideoTrackRef.current]);
                    if (audioTrack) newStream.addTrack(audioTrack);
                    setLocalStream(newStream);
                }
            } catch (err) {
                console.error("Error stopping screen share:", err);
            }
            setIsScreenSharing(false);
        } else {
            // Start screen sharing, swap camera track with screen track
            try {
                const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
                const screenTrack = stream.getVideoTracks()[0];

                // Listen for user stopping screen share from the browser's native UI
                screenTrack.onended = () => {
                    toggleScreenSharing();
                };

                const senders = peerConnectionRef.current.getSenders();
                const videoSender = senders.find(s => s.track && s.track.kind === 'video');

                if (videoSender) {
                    await videoSender.replaceTrack(screenTrack);

                    // Update local stream to show screen share to the user
                    const audioTrack = localStream.getAudioTracks()[0];
                    const newStream = new MediaStream([screenTrack]);
                    if (audioTrack) newStream.addTrack(audioTrack);
                    setLocalStream(newStream);

                    setIsScreenSharing(true);
                }
            } catch (err) {
                console.error("Error accessing display media.", err);
            }
        }
    };

    return {
        localStream,
        remoteStream,
        isConnected,
        micOn,
        cameraOn,
        isScreenSharing,
        messages,
        joinRoom,
        leaveRoom,
        toggleMic,
        toggleCamera,
        sendMessage,
        toggleScreenSharing
    };
}
