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
    const [socket, setSocket] = useState(null);

    const peerConnectionRef = useRef(null);

    useEffect(() => {
        // Connect to signaling server
        const newSocket = io('http://localhost:3001');
        setSocket(newSocket);

        return () => {
            newSocket.disconnect();
        };
    }, []);

    const initializeMedia = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            setLocalStream(stream);
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

        socket.on('user-disconnected', () => {
            console.log('Remote user disconnected');
            setRemoteStream(null);
        });

        setIsConnected(true);
    }, [socket]);

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
        if (localStream) {
            const videoTrack = localStream.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                setCameraOn(videoTrack.enabled);
            }
        }
    };

    return {
        localStream,
        remoteStream,
        isConnected,
        micOn,
        cameraOn,
        joinRoom,
        leaveRoom,
        toggleMic,
        toggleCamera
    };
}
