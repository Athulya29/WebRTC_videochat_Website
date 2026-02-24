import React, { useState, useEffect, useRef } from 'react';
import { Video, Mic, MicOff, VideoOff, PhoneOff, Phone, Users, Copy, Check, Send, MessageSquare, MonitorUp, MonitorOff, User, Shield, Sparkles, Hand, Smile } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { useWebRTC } from './hooks/useWebRTC';

function App() {
  const [roomId, setRoomId] = useState('');
  const [userName, setUserName] = useState('');
  const [inCall, setInCall] = useState(false);
  const [copied, setCopied] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [nameError, setNameError] = useState(false);
  const [joinFromLink, setJoinFromLink] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showReactions, setShowReactions] = useState(false);

  // Read room ID from URL query parameter (shared link)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomFromUrl = params.get('room');
    if (roomFromUrl) {
      setRoomId(roomFromUrl);
      setJoinFromLink(true);
      // Clean up the URL without reloading
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

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
    toggleScreenSharing,
    remotePeerName,
    reactions,
    localHandRaised,
    remoteHandRaised,
    sendReaction,
    toggleHand
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
      console.log("Setting remote stream to video element:", remoteStream);
      // Ensure playback starts
      remoteVideoRef.current.play().catch(e => console.error("Error playing remote video:", e));
    }
  }, [remoteStream]);

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!userName.trim()) {
      setNameError(true);
      return;
    }
    setNameError(false);
    if (!roomId.trim()) return;

    setInCall(true);
    await joinRoom(roomId, userName);
  };

  const handleJoinFromLink = async (e) => {
    e.preventDefault();
    if (!userName.trim()) {
      setNameError(true);
      return;
    }
    setNameError(false);
    setInCall(true);
    setJoinFromLink(false);
    await joinRoom(roomId, userName);
  };

  const handleCreate = () => {
    if (!userName.trim()) {
      setNameError(true);
      return;
    }
    setNameError(false);
    const newRoomId = uuidv4().slice(0, 8);
    setRoomId(newRoomId);
    setInCall(true);
    joinRoom(newRoomId, userName);
  };

  const handleLeave = () => {
    leaveRoom();
    setInCall(false);
    setRoomId('');
    setShowChat(false);
  };

  const getShareableLink = () => {
    const baseUrl = window.location.origin + window.location.pathname;
    return `${baseUrl}?room=${roomId}`;
  };

  const copyRoomId = () => {
    navigator.clipboard.writeText(getShareableLink());
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
              <h1 style={{ fontSize: '1.25rem' }}>Meetify</h1>
            </div>

            {userName && (
              <div className="user-greeting">
                <User size={16} />
                <span>Welcome, <strong>{userName}</strong></span>
              </div>
            )}

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
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`Join my Meetify video call!\n${getShareableLink()}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-icon btn-whatsapp"
                title="Share on WhatsApp"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
              </a>
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
                {userName || 'You'} {(!micOn || (!cameraOn && !isScreenSharing)) && <span style={{ color: 'var(--danger)' }}>•</span>}
                {isScreenSharing && <span style={{ marginLeft: '4px', color: 'var(--primary)' }}>(Screen Sharing)</span>}
                {localHandRaised && <Hand size={16} color="var(--primary)" style={{ marginLeft: '8px' }} />}
              </div>
            </div>

            {/* Remote Video */}
            <div className="video-wrapper">
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                style={{ display: remoteStream ? 'block' : 'none', width: '100%', height: '100%', objectFit: 'cover' }}
              />
              {!remoteStream && (
                <div className="waiting-msg">
                  <Users size={48} />
                  <p>{remotePeerName ? `${remotePeerName} is connecting...` : 'Waiting for others to join...'}</p>
                </div>
              )}
              {(remoteStream || remotePeerName) && (
                <div className="video-label">
                  {remotePeerName || 'Partner'}
                  {remoteHandRaised && <Hand size={16} color="var(--primary)" style={{ marginLeft: '8px' }} />}
                </div>
              )}
            </div>

            {/* Floating Reactions overlay */}
            <div className="reactions-overlay pointer-events-none">
              {reactions.map((reaction) => (
                <div
                  key={reaction.id}
                  className={`floating-reaction ${reaction.sender === 'local' ? 'reaction-local' : 'reaction-remote'}`}
                >
                  {reaction.emoji}
                </div>
              ))}
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
              className={`btn-icon ${localHandRaised ? 'active' : ''}`}
              style={localHandRaised ? { background: 'var(--primary)', borderColor: 'var(--primary)' } : {}}
              onClick={() => toggleHand(roomId)}
              title={localHandRaised ? 'Lower Hand' : 'Raise Hand'}
            >
              <Hand size={24} />
            </button>

            <div style={{ position: 'relative' }}>
              <button
                className={`btn-icon ${showReactions ? 'active' : ''}`}
                style={showReactions ? { background: 'var(--primary)', borderColor: 'var(--primary)' } : {}}
                onClick={() => setShowReactions(!showReactions)}
                title="Send Reaction"
              >
                <Smile size={24} />
              </button>

              {showReactions && (
                <div className="reaction-menu glass-box">
                  {['👍', '😂', '🎉', '❤️', '😮'].map(emoji => (
                    <button
                      key={emoji}
                      className="emoji-btn"
                      onClick={() => {
                        sendReaction(roomId, emoji);
                        setShowReactions(false);
                      }}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>

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

  // Streamlined join screen when opening a shared link
  if (joinFromLink && roomId) {
    return (
      <div className="app-container">
        {/* Animated background grid */}
        <div className="bg-grid"></div>

        {/* Aurora wave */}
        <div className="aurora">
          <div className="aurora-band aurora-band-1"></div>
          <div className="aurora-band aurora-band-2"></div>
          <div className="aurora-band aurora-band-3"></div>
        </div>

        {/* Twinkling stars */}
        <div className="stars">
          {[...Array(20)].map((_, i) => (
            <div key={`star-${i}`} className="star" style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 4}s`,
              animationDuration: `${2 + Math.random() * 3}s`,
              width: `${1 + Math.random() * 2}px`,
              height: `${1 + Math.random() * 2}px`,
            }}></div>
          ))}
        </div>

        {/* Floating orbs */}
        <div className="orb orb-1"></div>
        <div className="orb orb-2"></div>
        <div className="orb orb-3"></div>

        <div className="brand">
          <div className="brand-icon-ring">
            <Video className="brand-icon" size={40} />
          </div>
          <h1>Meetify</h1>
        </div>

        <div className="glass-box home-card">
          <div className="home-header">
            <h2>You're Invited!</h2>
            <p className="tagline">Enter your name to join the meeting</p>
          </div>

          <form onSubmit={handleJoinFromLink}>
            <div className="input-group anim-stagger-1">
              <label htmlFor="userName"><User size={14} style={{ verticalAlign: '-2px' }} /> Your Name</label>
              <input
                type="text"
                id="userName"
                className="input-field"
                placeholder="Enter your display name"
                value={userName}
                onChange={(e) => { setUserName(e.target.value); if (e.target.value.trim()) setNameError(false); }}
                autoFocus
                required
              />
              {nameError && <span style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.25rem' }}>Please enter your name</span>}
            </div>

            <button type="submit" className="btn btn-primary btn-glow anim-stagger-2" style={{ width: '100%', marginTop: '1rem' }}>
              <Phone size={20} />
              Join Meeting
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Regular Join Screen
  return (
    <div className="home-container">
      {/* Background elements */}
      <div className="home-bg">
        <div className="home-gradient"></div>
        <div className="home-curves">
          <svg viewBox="0 0 1440 320" preserveAspectRatio="none">
            <path fill="rgba(30, 41, 59, 0.4)" fillOpacity="1" d="M0,160L48,170.7C96,181,192,203,288,197.3C384,192,480,160,576,170.7C672,181,768,235,864,240C960,245,1056,203,1152,192C1248,181,1344,203,1392,213.3L1440,224L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
          </svg>
        </div>
      </div>

      <nav className="navbar">
        <div className="nav-brand">
          <div className="brand-icon-wrapper">
            <div className="play-triangle"></div>
          </div>
          <span className="brand-text">Meetify</span>
        </div>

        <button className="nav-btn" onClick={() => setShowCreateModal(true)}>Start Meeting</button>
      </nav>

      <main className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">Connect Instantly<br />with Meetify</h1>
          <p className="hero-subtitle">Secure, fast, and reliable video meetings<br />anytime, anywhere.</p>
          <div className="hero-buttons">
            <button className="btn-start" onClick={() => setShowCreateModal(true)}>Start a Meeting</button>
            <button className="btn-join" onClick={() => setShowJoinModal(true)}>Join with Code</button>
          </div>
        </div>

        <div className="hero-visual">
          {/* Laptop Mockup */}
          <div className="laptop-mockup">
            <div className="laptop-screen">
              <div className="video-call-ui">
                <div className="main-video">
                  <img src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80" alt="Main Speaker" />
                </div>
                <div className="sidebar-videos">
                  <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-1.2.1&auto=format&fit=crop&w=200&q=80" alt="Participant" />
                  <img src="https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?ixlib=rb-1.2.1&auto=format&fit=crop&w=200&q=80" alt="Participant" />
                </div>
                <div className="call-controls-mock">
                  <div className="ctrl-icon mic"></div>
                  <div className="ctrl-icon cam"></div>
                  <div className="ctrl-icon end"></div>
                </div>
              </div>
            </div>
            <div className="laptop-base">
              <div className="laptop-notch"></div>
            </div>
          </div>
        </div>
      </main>

      {/* Modals for Join/Create */}
      {(showJoinModal || showCreateModal) && (
        <div className="modal-overlay">
          <div className="modal-content glass-box">
            <button className="modal-close" onClick={() => { setShowJoinModal(false); setShowCreateModal(false); setNameError(false); }}>&times;</button>
            <div className="home-header">
              <h2>{showCreateModal ? 'New Meeting' : 'Join Meeting'}</h2>
              <p className="tagline">{showCreateModal ? 'Start a new secure meeting.' : 'Enter your name and room code.'}</p>
            </div>

            <form onSubmit={showCreateModal ? (e) => { e.preventDefault(); handleCreate(); } : handleJoin}>
              <div className="input-group">
                <label htmlFor="userName"><User size={14} style={{ verticalAlign: '-2px' }} /> Your Name</label>
                <input
                  type="text"
                  id="userName"
                  className="input-field"
                  placeholder="Enter your display name"
                  value={userName}
                  onChange={(e) => { setUserName(e.target.value); if (e.target.value.trim()) setNameError(false); }}
                  required
                  autoFocus
                />
                {nameError && <span style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.25rem' }}>Please enter your name</span>}
              </div>

              {showJoinModal && (
                <div className="input-group" style={{ marginTop: '1rem' }}>
                  <label htmlFor="roomId"><Users size={14} style={{ verticalAlign: '-2px' }} /> Room Code</label>
                  <input
                    type="text"
                    id="roomId"
                    className="input-field"
                    placeholder="Enter Room Code (e.g. abc-123)"
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value)}
                    required
                  />
                </div>
              )}

              <button type="submit" className="btn btn-primary btn-glow" style={{ width: '100%', marginTop: '1.5rem' }}>
                {showCreateModal ? <><Video size={20} /> Start Meeting</> : <><Users size={20} /> Join Meeting</>}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
