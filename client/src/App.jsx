import React, { useState, useEffect, useRef } from 'react';
import { Video, Mic, MicOff, VideoOff, PhoneOff, Phone, Users, Copy, Check, Send, MessageSquare, MonitorUp, MonitorOff } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { useWebRTC } from './hooks/useWebRTC';

function App() {
  const [roomId, setRoomId] = useState('');
  const [inCall, setInCall] = useState(false);
  const [copied, setCopied] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [showChat, setShowChat] = useState(false);

  const {
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
  } = useWebRTC();

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Auto scroll to bottom of chat
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, showChat]);

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
    setShowChat(false);
  };

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (chatInput.trim()) {
      sendMessage(roomId, chatInput);
      setChatInput('');
    }
  };

  if (inCall) {
    return (
      <div className="app-container app-in-call">
        <div className={`video-container ${showChat ? 'with-chat' : ''}`}>
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
                You {(!micOn || (!cameraOn && !isScreenSharing)) && <span style={{ color: 'var(--danger)' }}>•</span>}
                {isScreenSharing && <span style={{ marginLeft: '4px', color: 'var(--primary)' }}>(Screen Sharing)</span>}
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
              className={`btn-icon ${!cameraOn && !isScreenSharing ? 'off' : ''}`}
              onClick={toggleCamera}
              title={cameraOn ? 'Turn off camera' : 'Turn on camera'}
              disabled={isScreenSharing}
              style={isScreenSharing ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
            >
              {cameraOn ? <Video size={24} /> : <VideoOff size={24} />}
            </button>

            <button
              className={`btn-icon ${isScreenSharing ? 'active' : ''}`}
              onClick={toggleScreenSharing}
              title={isScreenSharing ? 'Stop sharing' : 'Share screen'}
              style={isScreenSharing ? { background: 'var(--primary)', borderColor: 'var(--primary)' } : {}}
            >
              {isScreenSharing ? <MonitorOff size={24} /> : <MonitorUp size={24} />}
            </button>

            <button
              className="btn btn-danger"
              onClick={handleLeave}
              style={{ width: 'auto', padding: '1rem 2rem', borderRadius: '40px' }}
            >
              <PhoneOff size={20} />
              <span className="hide-mobile">Leave Call</span>
            </button>

            <button
              className={`btn-icon ${showChat ? 'active' : ''}`}
              style={showChat ? { background: 'var(--primary)', borderColor: 'var(--primary)' } : {}}
              onClick={() => setShowChat(!showChat)}
              title="Toggle Chat"
            >
              <MessageSquare size={24} />
            </button>
          </div>
        </div>

        {/* Chat Sidebar */}
        {showChat && (
          <div className="chat-container glass-box">
            <div className="chat-header">
              <h3>Meeting Chat</h3>
            </div>

            <div className="chat-messages">
              {messages.length === 0 ? (
                <div className="empty-chat text-muted">No messages yet. Say hi!</div>
              ) : (
                messages.map((msg, idx) => (
                  <div key={idx} className={`message-bubble ${msg.sender}`}>
                    {msg.text}
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            <form className="chat-input-form" onSubmit={handleSendMessage}>
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Type a message..."
                className="input-field chat-input"
              />
              <button
                type="submit"
                className="btn-primary send-btn"
                disabled={!chatInput.trim()}
              >
                <Send size={18} />
              </button>
            </form>
          </div>
        )}
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
