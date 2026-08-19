// CipherLink Web Client - Simplified Version
// Implements core functionality with clean structure

import React, { useState } from 'react';
import { 
  IdentityManager, 
  CipherLinkIdentity,
  MessageCrypto
} from '../../crypto/core';

// Types
interface Contact {
  uid: string;
  name: string;
  publicKey: string;
  fingerprint: string;
  isVerified: boolean;
}

interface Message {
  id: string;
  from: string;
  to: string;
  content: string;
  timestamp: number;
  type: 'text' | 'image' | 'file';
}

interface AppState {
  identity: CipherLinkIdentity | null;
  contacts: Contact[];
  messages: Message[];
  activeContact: string | null;
  newMessage: string;
}

const CipherLinkApp: React.FC = () => {
  const [state, setState] = useState<AppState>({
    identity: null,
    contacts: [],
    messages: [],
    activeContact: null,
    newMessage: ''
  });

  const [authMode, setAuthMode] = useState<'new' | 'restore'>('new');
  const [seedPhrase, setSeedPhrase] = useState('');
  const [password, setPassword] = useState('');

  // Authentication handlers
  const handleCreateIdentity = () => {
    try {
      const identity = IdentityManager.generateNewIdentity();
      setState(prev => ({ ...prev, identity }));
    } catch (error) {
      console.error('Failed to create identity:', error);
    }
  };

  const handleRestoreIdentity = () => {
    try {
      const identity = IdentityManager.restoreIdentity(seedPhrase);
      setState(prev => ({ ...prev, identity }));
    } catch (error) {
      console.error('Failed to restore identity:', error);
    }
  };

  // Message handlers
  const handleSendMessage = () => {
    if (!state.activeContact || !state.newMessage.trim() || !state.identity) return;
    
    const recipient = state.contacts.find(c => c.uid === state.activeContact);
    if (!recipient) return;
    
    const newMessage: Message = {
      id: `msg_${Date.now()}`,
      from: state.identity.uid,
      to: state.activeContact,
      content: state.newMessage,
      timestamp: Date.now(),
      type: 'text'
    };
    
    setState(prev => ({
      ...prev,
      messages: [...prev.messages, newMessage],
      newMessage: ''
    }));
  };

  // Add sample contact for demo
  const addSampleContact = () => {
    const sampleContact: Contact = {
      uid: 'sample_user_123',
      name: 'Sample Contact',
      publicKey: 'sample_public_key',
      fingerprint: 'SAMPLE123',
      isVerified: false
    };
    
    setState(prev => ({
      ...prev,
      contacts: [...prev.contacts, sampleContact]
    }));
  };

  // Render authentication screen
  if (!state.identity) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem'
      }}>
        <div style={{
          background: '#1e293b',
          borderRadius: '1rem',
          padding: '2rem',
          width: '100%',
          maxWidth: '24rem',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: '1px solid #334155'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{ fontSize: '2.25rem', marginBottom: '1rem' }}>🔐</div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white', marginBottom: '0.5rem' }}>
              CipherLink
            </h1>
            <p style={{ color: '#94a3b8' }}>Secure Anonymous Messaging</p>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <button
              onClick={() => setAuthMode('new')}
              style={{
                flex: 1,
                padding: '0.5rem 1rem',
                borderRadius: '0.5rem',
                backgroundColor: authMode === 'new' ? '#0891b2' : '#334155',
                color: 'white',
                border: 'none',
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
            >
              New Account
            </button>
            <button
              onClick={() => setAuthMode('restore')}
              style={{
                flex: 1,
                padding: '0.5rem 1rem',
                borderRadius: '0.5rem',
                backgroundColor: authMode === 'restore' ? '#0891b2' : '#334155',
                color: 'white',
                border: 'none',
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
            >
              Restore
            </button>
          </div>

          {authMode === 'new' ? (
            <div style={{ textAlign: 'center' }}>
              <p style={{ color: '#cbd5e1', fontSize: '0.875rem', marginBottom: '1rem' }}>
                Your identity will be generated with a 12-word seed phrase.
              </p>
              <button
                onClick={handleCreateIdentity}
                style={{
                  width: '100%',
                  backgroundColor: '#0891b2',
                  color: 'white',
                  border: 'none',
                  padding: '0.75rem',
                  borderRadius: '0.5rem',
                  fontWeight: 'medium',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
              >
                Create New Identity
              </button>
            </div>
          ) : (
            <div style={{ spaceY: '1rem' }}>
              <textarea
                value={seedPhrase}
                onChange={(e) => setSeedPhrase(e.target.value)}
                placeholder="Enter your 12-word seed phrase"
                style={{
                  width: '100%',
                  backgroundColor: '#334155',
                  border: '1px solid #475569',
                  borderRadius: '0.5rem',
                  padding: '0.75rem',
                  color: 'white',
                  resize: 'vertical',
                  minHeight: '6rem'
                }}
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                style={{
                  width: '100%',
                  backgroundColor: '#334155',
                  border: '1px solid #475569',
                  borderRadius: '0.5rem',
                  padding: '0.75rem',
                  color: 'white',
                  marginTop: '1rem'
                }}
              />
              <button
                onClick={handleRestoreIdentity}
                disabled={!seedPhrase || !password}
                style={{
                  width: '100%',
                  backgroundColor: '#a855f7',
                  color: 'white',
                  border: 'none',
                  padding: '0.75rem',
                  borderRadius: '0.5rem',
                  fontWeight: 'medium',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                  marginTop: '1rem',
                  opacity: seedPhrase && password ? 1 : 0.5
                }}
              >
                Restore Identity
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Render main app
  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      backgroundColor: '#0f172a',
      color: '#f1f5f9'
    }}>
      {/* Sidebar */}
      <div style={{
        width: '20rem',
        backgroundColor: '#1e293b',
        borderRight: '1px solid #334155',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* User Info */}
        <div style={{ padding: '1rem', borderBottom: '1px solid #334155' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '3rem',
              height: '3rem',
              backgroundColor: '#0891b2',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
              color: 'white'
            }}>
              {state.identity.uid.substring(0, 2).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 'semibold', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                Anonymous User
              </div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                {state.identity.fingerprint}
              </div>
            </div>
          </div>
        </div>

        {/* Contacts List */}
        <div style={{ padding: '1rem', flex: 1 }}>
          <button
            onClick={addSampleContact}
            style={{
              width: '100%',
              backgroundColor: '#0891b2',
              color: 'white',
              border: 'none',
              padding: '0.5rem',
              borderRadius: '0.5rem',
              marginBottom: '1rem',
              cursor: 'pointer'
            }}
          >
            + Add Sample Contact
          </button>

          <div style={{ spaceY: '0.5rem' }}>
            {state.contacts.map(contact => (
              <div
                key={contact.uid}
                onClick={() => setState(prev => ({ ...prev, activeContact: contact.uid }))}
                style={{
                  padding: '0.75rem',
                  backgroundColor: state.activeContact === contact.uid ? '#0891b220' : 'transparent',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem'
                }}
              >
                <div style={{
                  width: '2.5rem',
                  height: '2.5rem',
                  backgroundColor: '#334155',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold'
                }}>
                  {contact.name.charAt(0)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 'medium' }}>{contact.name}</div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                    {contact.fingerprint}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {state.activeContact ? (
          <>
            {/* Chat Header */}
            <div style={{
              padding: '1rem',
              backgroundColor: '#1e293b',
              borderBottom: '1px solid #334155',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  width: '2.5rem',
                  height: '2.5rem',
                  backgroundColor: '#334155',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold'
                }}>
                  {state.contacts.find(c => c.uid === state.activeContact)?.name.charAt(0)}
                </div>
                <div>
                  <div style={{ fontWeight: 'semibold' }}>
                    {state.contacts.find(c => c.uid === state.activeContact)?.name}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Online</div>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div style={{ 
              flex: 1, 
              overflowY: 'auto', 
              padding: '1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            }}>
              {state.messages
                .filter(msg => msg.to === state.activeContact || msg.from === state.activeContact)
                .map(message => (
                  <div
                    key={message.id}
                    style={{
                      display: 'flex',
                      justifyContent: message.from === state.identity!.uid ? 'flex-end' : 'flex-start'
                    }}
                  >
                    <div style={{
                      maxWidth: '75%',
                      padding: '0.75rem 1rem',
                      borderRadius: '1.5rem',
                      backgroundColor: message.from === state.identity!.uid ? '#0891b2' : '#334155',
                      color: 'white',
                      borderRadius: message.from === state.identity!.uid 
                        ? '1.5rem 1.5rem 0 1.5rem' 
                        : '1.5rem 1.5rem 1.5rem 0'
                    }}>
                      <div>{message.content}</div>
                      <div style={{ 
                        fontSize: '0.75rem', 
                        opacity: 0.7, 
                        marginTop: '0.25rem',
                        textAlign: 'right'
                      }}>
                        {new Date(message.timestamp).toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </div>
                    </div>
                  </div>
                ))}
            </div>

            {/* Message Input */}
            <div style={{
              padding: '1rem',
              backgroundColor: '#1e293b',
              borderTop: '1px solid #334155'
            }}>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  value={state.newMessage}
                  onChange={(e) => setState(prev => ({ ...prev, newMessage: e.target.value }))}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Type a message..."
                  style={{
                    flex: 1,
                    backgroundColor: '#334155',
                    border: '1px solid #475569',
                    borderRadius: '1.5rem',
                    padding: '0.75rem 1.5rem',
                    color: 'white',
                    outline: 'none'
                  }}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!state.newMessage.trim()}
                  style={{
                    backgroundColor: '#0891b2',
                    color: 'white',
                    border: 'none',
                    borderRadius: '50%',
                    width: '2.5rem',
                    height: '2.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    opacity: state.newMessage.trim() ? 1 : 0.5
                  }}
                >
                  ➤
                </button>
              </div>
            </div>
          </>
        ) : (
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>💬</div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                Welcome to CipherLink
              </h2>
              <p style={{ color: '#94a3b8' }}>
                Select a contact to start chatting securely
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CipherLinkApp;