import React, { useState, useEffect, useRef } from 'react';
import { Video, Mic, MicOff, VideoOff, PhoneOff, Phone, Users, Copy, Check } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { useWebRTC } from './hooks/useWebRTC';

function App() {
  const [roomId, setRoomId] = useState('');
  const [inCall, setInCall] = useState(false);
  const [copied, setCopied] = useState(false);

  const {
    localStream,
    remoteStream,
    isConnected,
    micOn,
    cameraOn,
    joinRoom,
    leaveRoom,
    toggleMic,
    toggleCamera
  } = useWebRTC();

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  // Bind streams to video elements
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!roomId.trim()) return;

    setInCall(true);
    await joinRoom(roomId);
  };

  const handleCreate = () => {
    const newRoomId = uuidv4().slice(0, 8);
    setRoomId(newRoomId);
    setInCall(true);
    joinRoom(newRoomId);
  };

  const handleLeave = () => {
    leaveRoom();
    setInCall(false);
    setRoomId('');
  };

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (inCall) {
    return (
      <div className="app-container">
        <div className="video-container">
          {/* Header */}
          <div className="header-room">
            <div className="brand" style={{ marginBottom: 0 }}>
              <Video className="brand-icon" size={24} />
              <h1 style={{ fontSize: '1.25rem' }}>NovaMeet</h1>
            </div>

            <div className="room-id">
              Room ID: <span>{roomId}</span>
              <button
                className="btn-icon"
                style={{ padding: '0.5rem', background: 'transparent', border: 'none' }}
                onClick={copyRoomId}
                title="Copy Room ID"
              >
                {copied ? <Check size={16} color="var(--success)" /> : <Copy size={16} />}
              </button>
            </div>
          </div>

          {/* Videos Grid */}
          <div className="video-grid">
            {/* Local Video */}
            <div className="video-wrapper local">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted // Mute local video to prevent echo
              />
              <div className="video-label">
                You {(!micOn || !cameraOn) && <span style={{ color: 'var(--danger)' }}>•</span>}
              </div>
            </div>

            {/* Remote Video */}
            <div className="video-wrapper">
              {remoteStream ? (
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                />
              ) : (
                <div className="waiting-msg">
                  <Users size={48} />
                  <p>Waiting for others to join...</p>
                </div>
              )}
              {remoteStream && (
                <div className="video-label">Partner</div>
              )}
            </div>
          </div>

          {/* Controls */}
          <div className="controls">
            <button
              className={`btn-icon ${!micOn ? 'off' : ''}`}
              onClick={toggleMic}
              title={micOn ? 'Mute' : 'Unmute'}
            >
              {micOn ? <Mic size={24} /> : <MicOff size={24} />}
            </button>

            <button
              className="btn btn-danger"
              onClick={handleLeave}
              style={{ width: 'auto', padding: '1rem 2rem', borderRadius: '40px' }}
            >
              <PhoneOff size={20} />
              <span>Leave Call</span>
            </button>

            <button
              className={`btn-icon ${!cameraOn ? 'off' : ''}`}
              onClick={toggleCamera}
              title={cameraOn ? 'Turn off camera' : 'Turn on camera'}
            >
              {cameraOn ? <Video size={24} /> : <VideoOff size={24} />}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Join Screen
  return (
    <div className="app-container">
      <div className="brand">
        <Video className="brand-icon" size={40} />
        <h1>NovaMeet</h1>
      </div>

      <div className="glass-box">
        <div>
          <h2>Premium Video Calling</h2>
          <p>Connect instantly with crystal clear quality.</p>
        </div>

        <button className="btn btn-primary" onClick={handleCreate}>
          <Video size={20} />
          New Meeting
        </button>

        <div className="divider">or</div>

        <form className="input-group" onSubmit={handleJoin}>
          <label htmlFor="roomId">Join using code</label>
          <input
            type="text"
            id="roomId"
            className="input-field"
            placeholder="Enter Room Code (e.g. abc-123)"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
          />
          <button
            type="submit"
            className="btn btn-primary"
            style={{ marginTop: '0.5rem', background: 'var(--surface)', border: '1px solid var(--surface-border)', color: 'var(--text)' }}
            disabled={!roomId.trim()}
          >
            <Users size={20} />
            Join Meeting
          </button>
        </form>
      </div>
    </div>
  );
}

export default App;
