import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Send, ShoppingCart, CheckCircle, AlertTriangle, Info } from 'lucide-react';
import './AlkostoStyles.css';

const AlkostoProductAdvisor = () => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [notification, setNotification] = useState(null);
  const [showChat, setShowChat] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const NotificationComponent = ({ notification, onClose }) => {
    if (!notification) return null;

    const getNotificationStyles = (type) => {
      switch (type) {
        case 'success':
          return { backgroundColor: '#2563eb', color: 'white' };
        case 'warning':
          return { backgroundColor: '#eab308', color: '#1f2937' };
        case 'error':
          return { backgroundColor: '#dc2626', color: 'white' };
        case 'info':
          return { backgroundColor: '#dbeafe', color: '#1e40af' };
        default:
          return { backgroundColor: '#4b5563', color: 'white' };
      }
    };

    const getIcon = (type) => {
      switch (type) {
        case 'success': return CheckCircle;
        case 'warning': return AlertTriangle;
        case 'error': return AlertTriangle;
        case 'info': return Info;
        default: return Info;
      }
    };

    const IconComponent = getIcon(notification.type);

    return (
      <div style={{
        position: 'fixed',
        top: '1rem',
        right: '1rem',
        zIndex: 50,
        padding: '1rem',
        borderRadius: '0.5rem',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        maxWidth: '24rem',
        ...getNotificationStyles(notification.type)
      }}>
        <IconComponent style={{ width: '1.25rem', height: '1.25rem', flexShrink: 0 }} />
        <span style={{ fontSize: '0.875rem', flex: 1 }}>{notification.message}</span>
        <button
          onClick={onClose}
          style={{
            marginLeft: '0.5rem',
            background: 'none',
            border: 'none',
            color: 'inherit',
            cursor: 'pointer'
          }}
        >
          ✕
        </button>
      </div>
    );
  };

  const startVoiceSearch = () => {
    setIsListening(true);
    showNotification('info', 'Escuchando... ¡Pregúntame sobre productos!');

    const voiceQueries = [
      '¿Qué televisores Samsung tienen disponibles?',
      '¿Cuáles son los mejores refrigeradores?',
      '¿Tienen notebooks para gaming?',
      'Busco un celular iPhone',
      '¿Qué lavadoras recomiendan?'
    ];

    setTimeout(() => {
      setIsListening(false);
      const randomQuery = voiceQueries[Math.floor(Math.random() * voiceQueries.length)];
      setInputMessage(randomQuery);
      showNotification('success', 'Pregunta capturada por voz');
      setShowChat(true);

      setTimeout(() => {
        sendMessage(randomQuery);
      }, 500);
    }, 3000);
  };

  const sendMessage = async (message = inputMessage) => {
    if (!message.trim()) return;

    if (!showChat) setShowChat(true);

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: message,
      timestamp: new Date().toLocaleTimeString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      console.log('🚀 Enviando mensaje al agente:', message);
      
      // Korrigiertes Format basierend auf offizieller Letta API docs
      const requestBody = {
        messages: [
          {
            role: 'user',
            content: message
          }
        ],
        use_assistant_message: true,
        assistant_message_tool_name: 'send_message',
        assistant_message_tool_kwarg: 'message'
      };

      console.log('📤 Request body:', JSON.stringify(requestBody, null, 2));

      const response = await fetch('http://localhost:8283/v1/agents/agent-c6f6c85a-89c5-4a31-9fb9-ac7945dcf43f/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      console.log('📡 Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Error response:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('📦 Respuesta completa del agente:', data);

      // Parser für Letta Response basierend auf docs
      let responseContent = '';
      
      if (data.messages && Array.isArray(data.messages)) {
        // Suche nach AssistantMessage oder tool_call_message mit send_message
        for (const msg of data.messages) {
          if (msg.message_type === 'assistant_message' && msg.content) {
            responseContent = msg.content;
            break;
          } else if (msg.message_type === 'tool_call_message' && 
                     msg.tool_call && 
                     msg.tool_call.name === 'send_message' &&
                     msg.tool_call.arguments) {
            responseContent = msg.tool_call.arguments.message || msg.tool_call.arguments.content || '';
            break;
          }
        }
      }

      if (!responseContent) {
        responseContent = 'El agente respondió pero no pude extraer el contenido del mensaje.';
        console.log('⚠️ No assistant message found in response:', data);
      }

      const botResponse = {
        id: Date.now() + 1,
        type: 'bot',
        content: responseContent,
        timestamp: new Date().toLocaleTimeString(),
        products: []
      };

      setMessages(prev => [...prev, botResponse]);
      showNotification('success', '✅ Agente respondió correctamente');

    } catch (error) {
      console.error('❌ Error completo:', error);

      // Fallback response
      const fallbackResponse = {
        id: Date.now() + 1,
        type: 'bot',
        content: 'Lo siento, hay un problema de comunicación con el agente. Revisa la consola para más detalles.',
        timestamp: new Date().toLocaleTimeString(),
        products: []
      };

      setMessages(prev => [...prev, fallbackResponse]);
      showNotification('error', '❌ Error de comunicación con el agente');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const ProductCard = ({ product }) => (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '0.5rem',
      border: '1px solid #e5e7eb',
      padding: '1rem',
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
      marginBottom: '1rem',
      maxWidth: '24rem',
      transition: 'box-shadow 0.15s ease-in-out'
    }}>
      <div style={{ marginBottom: '0.75rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
          {product.discount && (
            <span style={{
              padding: '0.25rem 0.5rem',
              fontSize: '0.75rem',
              fontWeight: 'bold',
              borderRadius: '0.25rem',
              color: 'white',
              backgroundColor: '#2563eb'
            }}>
              {product.discount}
            </span>
          )}
          {product.badge && (
            <span style={{
              padding: '0.25rem 0.5rem',
              fontSize: '0.75rem',
              borderRadius: '0.25rem',
              border: '1px solid',
              backgroundColor: product.badge === 'Envío gratis' ? '#f0fdf4' : '#fff7ed',
              color: product.badge === 'Envío gratis' ? '#15803d' : '#ea580c',
              borderColor: product.badge === 'Envío gratis' ? '#bbf7d0' : '#fed7aa'
            }}>
              {product.badge}
            </span>
          )}
        </div>

        <h4 style={{
          fontSize: '0.875rem',
          fontWeight: 'normal',
          color: '#111827',
          lineHeight: '1.25',
          marginBottom: '0.75rem'
        }}>
          {product.name}
        </h4>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginBottom: '1rem' }}>
          {product.originalPrice && (
            <span style={{
              fontSize: '0.875rem',
              color: '#6b7280',
              textDecoration: 'line-through'
            }}>
              ${product.originalPrice}
            </span>
          )}
          <span style={{
            fontSize: '1.25rem',
            fontWeight: 'bold',
            color: '#f97316'
          }}>
            ${product.price}
          </span>
        </div>
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
        <button
          style={{
            flex: 1,
            backgroundColor: '#f97316',
            color: 'white',
            padding: '0.5rem 0.75rem',
            fontSize: '0.875rem',
            fontWeight: 'bold',
            borderRadius: '0.375rem',
            border: 'none',
            cursor: 'pointer',
            transition: 'background-color 0.15s ease-in-out'
          }}
          onClick={() => showNotification('success', 'Producto agregado al carrito')}
          onMouseOver={(e) => e.target.style.backgroundColor = '#ea580c'}
          onMouseOut={(e) => e.target.style.backgroundColor = '#f97316'}
        >
          Comprar
        </button>
        <button
          style={{
            padding: '0.5rem',
            border: '1px solid #d1d5db',
            borderRadius: '0.375rem',
            backgroundColor: 'transparent',
            color: '#4b5563',
            cursor: 'pointer',
            transition: 'border-color 0.15s ease-in-out'
          }}
          onClick={() => showNotification('info', 'Producto agregado a favoritos')}
          onMouseOver={(e) => e.target.style.borderColor = '#9ca3af'}
          onMouseOut={(e) => e.target.style.borderColor = '#d1d5db'}
        >
          <ShoppingCart style={{ width: '1rem', height: '1rem' }} />
        </button>
      </div>
    </div>
  );

  if (!showChat) {
    return (
      <div 
        className="alkosto-gradient"
        style={{
          minHeight: '100vh',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <NotificationComponent
          notification={notification}
          onClose={() => setNotification(null)}
        />

        {/* Header */}
        <header 
          className="alkosto-glassmorphism"
          style={{
            position: 'relative',
            zIndex: 10,
            borderBottom: '1px solid rgba(255, 255, 255, 0.2)'
          }}
        >
          <div style={{ maxWidth: '80rem', margin: '0 auto', padding: '0 1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '4rem' }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{
                  fontSize: '1.25rem',
                  fontWeight: 'bold',
                  color: 'white'
                }}>
                  alkosto.ai
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div style={{
          flex: 1,
          position: 'relative',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          paddingTop: '3rem'
        }}>
          
          {/* Title Section */}
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2 style={{
              fontSize: '2.5rem',
              fontWeight: 'bold',
              color: 'white',
              marginBottom: '1rem',
              margin: 0
            }}>
              ¿Preguntas?
            </h2>
            <h3 style={{
              fontSize: '1.25rem',
              fontWeight: 'normal',
              color: 'rgba(255, 255, 255, 0.9)',
              margin: 0
            }}>
              Te asesoramos
            </h3>
          </div>

          {/* Category Cards - Kompakter wie Original */}
          <div style={{ width: '100%', maxWidth: '48rem', marginBottom: '3rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div
                className="alkosto-glassmorphism alkosto-shadow"
                style={{
                  borderRadius: '1rem',
                  padding: '1.5rem 2rem',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  transform: 'scale(1)',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)'
                }}
                onClick={() => sendMessage('¿Qué televisores Samsung tienen disponibles?')}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
                  e.currentTarget.style.transform = 'scale(1.02)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                <h3 style={{
                  fontSize: '1.5rem',
                  fontWeight: '600',
                  color: 'white',
                  marginBottom: '0.5rem',
                  margin: '0 0 0.5rem 0'
                }}>
                  Televisores y Audio
                </h3>
                <p style={{
                  color: 'rgba(255, 255, 255, 0.8)',
                  fontSize: '1rem',
                  margin: 0
                }}>
                  Samsung, LG, Sony y más marcas
                </p>
              </div>

              <div
                className="alkosto-glassmorphism alkosto-shadow"
                style={{
                  borderRadius: '1rem',
                  padding: '1.5rem 2rem',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  transform: 'scale(1)',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)'
                }}
                onClick={() => sendMessage('¿Cuáles son los mejores refrigeradores?')}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
                  e.currentTarget.style.transform = 'scale(1.02)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                <h3 style={{
                  fontSize: '1.5rem',
                  fontWeight: '600',
                  color: 'white',
                  marginBottom: '0.5rem',
                  margin: '0 0 0.5rem 0'
                }}>
                  Electrodomésticos
                </h3>
                <p style={{
                  color: 'rgba(255, 255, 255, 0.8)',
                  fontSize: '1rem',
                  margin: 0
                }}>
                  Refrigeradores, lavadoras y más
                </p>
              </div>

              <div
                className="alkosto-glassmorphism alkosto-shadow"
                style={{
                  borderRadius: '1rem',
                  padding: '1.25rem 2rem',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  transform: 'scale(1)',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)'
                }}
                onClick={() => sendMessage('¿Tienen notebooks para gaming?')}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
                  e.currentTarget.style.transform = 'scale(1.02)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                <h3 style={{
                  fontSize: '1.25rem',
                  fontWeight: '600',
                  color: 'white',
                  marginBottom: '0.25rem',
                  margin: '0 0 0.25rem 0'
                }}>
                  Computadores y Gaming
                </h3>
                <p style={{
                  color: 'rgba(255, 255, 255, 0.8)',
                  fontSize: '0.875rem',
                  margin: 0
                }}>
                  Laptops, PCs y accesorios gaming
                </p>
              </div>
            </div>
          </div>

          {/* Voice Button - Kleiner wie Original */}
          <div style={{ marginBottom: '2.5rem' }}>
            <button
              onClick={startVoiceSearch}
              disabled={isListening}
              className="alkosto-glassmorphism alkosto-shadow"
              style={{
                width: '5rem',
                height: '5rem',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.3s ease',
                transform: isListening ? 'scale(1.05)' : 'scale(1)',
                backgroundColor: isListening ? '#ef4444' : 'rgba(255, 255, 255, 0.25)',
                border: '1px solid rgba(255, 255, 255, 0.4)',
                cursor: 'pointer'
              }}
              onMouseOver={(e) => {
                if (!isListening) {
                  e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.35)';
                  e.target.style.transform = 'scale(1.05)';
                }
              }}
              onMouseOut={(e) => {
                if (!isListening) {
                  e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.25)';
                  e.target.style.transform = 'scale(1)';
                }
              }}
            >
              {isListening ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
                  <div style={{
                    width: '0.5rem',
                    height: '0.5rem',
                    backgroundColor: 'white',
                    borderRadius: '50%',
                    animation: 'pulse 2s infinite'
                  }}></div>
                  <div style={{
                    width: '0.5rem',
                    height: '0.5rem',
                    backgroundColor: 'white',
                    borderRadius: '50%',
                    animation: 'pulse 2s infinite 0.2s'
                  }}></div>
                  <div style={{
                    width: '0.5rem',
                    height: '0.5rem',
                    backgroundColor: 'white',
                    borderRadius: '50%',
                    animation: 'pulse 2s infinite 0.4s'
                  }}></div>
                </div>
              ) : (
                <Mic style={{ width: '2rem', height: '2rem', color: 'white' }} />
              )}
            </button>
          </div>

          {/* Input Field - Mit dunklem Hintergrund und weißem Text */}
          <div style={{ width: '100%', maxWidth: '60rem', padding: '0 2rem' }}>
            <div 
              style={{
                background: 'rgba(0, 0, 0, 0.3)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '2px solid rgba(255, 255, 255, 0.3)',
                borderRadius: '2rem',
                padding: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                minHeight: '4rem',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
              }}
            >
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Pregunta sin problema."
                style={{
                  flex: 1,
                  backgroundColor: 'transparent',
                  padding: '1.5rem 2rem',
                  border: 'none',
                  outline: 'none',
                  color: 'white',
                  fontSize: '1.25rem',
                  lineHeight: '1.5rem',
                  fontWeight: 'normal'
                }}
              />
              <button
                onClick={() => sendMessage()}
                disabled={!inputMessage.trim()}
                style={{
                  width: '3.5rem',
                  height: '3.5rem',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s ease',
                  opacity: !inputMessage.trim() ? 0.5 : 1,
                  backgroundColor: 'rgba(255, 255, 255, 0.4)',
                  border: '2px solid rgba(255, 255, 255, 0.6)',
                  marginLeft: '0.5rem',
                  cursor: inputMessage.trim() ? 'pointer' : 'not-allowed',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)'
                }}
                onMouseEnter={(e) => {
                  if (inputMessage.trim()) {
                    e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.5)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.4)';
                }}
              >
                <Send style={{ width: '1.5rem', height: '1.5rem', color: 'white' }} />
              </button>
            </div>
          </div>

          <style>{`
            input::placeholder {
              color: rgba(255, 255, 255, 0.8) !important;
            }
            input::-webkit-input-placeholder {
              color: rgba(255, 255, 255, 0.8) !important;
            }
            input::-moz-placeholder {
              color: rgba(255, 255, 255, 0.8) !important;
              opacity: 1 !important;
            }
            input:-ms-input-placeholder {
              color: rgba(255, 255, 255, 0.8) !important;
            }
          `}</style>
        </div>

        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}</style>
      </div>
    );
  }

  // Chat Interface
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>
      <NotificationComponent
        notification={notification}
        onClose={() => setNotification(null)}
      />

      {/* Header */}
      <header style={{
        backgroundColor: 'white',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
        borderBottom: '1px solid #e5e7eb'
      }}>
        <div style={{ maxWidth: '80rem', margin: '0 auto', padding: '0 1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '4rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <button
                onClick={() => setShowChat(false)}
                style={{
                  color: '#6b7280',
                  background: 'none',
                  border: 'none',
                  fontSize: '1.125rem',
                  cursor: 'pointer',
                  transition: 'color 0.15s ease'
                }}
                onMouseOver={(e) => e.target.style.color = '#374151'}
                onMouseOut={(e) => e.target.style.color = '#6b7280'}
              >
                ←
              </button>
              <span style={{
                fontSize: '1.125rem',
                fontWeight: 'bold',
                color: '#1f2937'
              }}>
                alkosto.ai
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <button
                onClick={startVoiceSearch}
                style={{
                  padding: '0.5rem',
                  borderRadius: '50%',
                  transition: 'background-color 0.15s ease',
                  backgroundColor: isListening ? '#fecaca' : '#dbeafe',
                  color: isListening ? '#dc2626' : '#2563eb',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                {isListening ? <MicOff style={{ width: '1.25rem', height: '1.25rem' }} /> : <Mic style={{ width: '1.25rem', height: '1.25rem' }} />}
              </button>
              <ShoppingCart style={{
                width: '1.25rem',
                height: '1.25rem',
                color: '#6b7280',
                cursor: 'pointer',
                transition: 'color 0.15s ease'
              }} />
            </div>
          </div>
        </div>
      </header>

      {/* Chat Messages */}
      <div style={{ maxWidth: '64rem', margin: '0 auto', padding: '1rem', paddingTop: '1.5rem' }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '0.75rem',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
          overflow: 'hidden'
        }}>
          <div style={{
            height: '24rem',
            overflowY: 'auto',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}>
            {messages.map((message) => (
              <div
                key={message.id}
                style={{
                  display: 'flex',
                  justifyContent: message.type === 'user' ? 'flex-end' : 'flex-start'
                }}
              >
                <div
                  style={{
                    maxWidth: '24rem',
                    padding: '0.75rem 1rem',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    backgroundColor: message.type === 'user' ? '#2563eb' : '#f3f4f6',
                    color: message.type === 'user' ? 'white' : '#111827',
                    marginLeft: message.type === 'user' ? 'auto' : '0'
                  }}
                >
                  <p style={{ lineHeight: 1.6, margin: 0 }}>{message.content}</p>
                  {message.products && message.products.length > 0 && (
                    <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {message.products.map((product, idx) => (
                        <ProductCard key={idx} product={product} />
                      ))}
                    </div>
                  )}
                  <span style={{
                    fontSize: '0.75rem',
                    opacity: 0.7,
                    marginTop: '0.5rem',
                    display: 'block'
                  }}>
                    {message.timestamp}
                  </span>
                </div>
              </div>
            ))}

            {isLoading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{
                  backgroundColor: '#f3f4f6',
                  color: '#111827',
                  maxWidth: '24rem',
                  padding: '0.5rem 1rem',
                  borderRadius: '0.5rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <div style={{
                      width: '0.5rem',
                      height: '0.5rem',
                      backgroundColor: '#9ca3af',
                      borderRadius: '50%',
                      animation: 'bounce 1s infinite'
                    }}></div>
                    <div style={{
                      width: '0.5rem',
                      height: '0.5rem',
                      backgroundColor: '#9ca3af',
                      borderRadius: '50%',
                      animation: 'bounce 1s infinite 0.1s'
                    }}></div>
                    <div style={{
                      width: '0.5rem',
                      height: '0.5rem',
                      backgroundColor: '#9ca3af',
                      borderRadius: '50%',
                      animation: 'bounce 1s infinite 0.2s'
                    }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div style={{ borderTop: '1px solid #e5e7eb', padding: '1rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Escribe tu pregunta aquí..."
                style={{
                  flex: 1,
                  border: '1px solid #d1d5db',
                  borderRadius: '0.5rem',
                  padding: '0.75rem 1rem',
                  outline: 'none',
                  fontSize: '0.875rem',
                  transition: 'border-color 0.15s ease'
                }}
                disabled={isLoading}
              />
              <button
                onClick={() => sendMessage()}
                disabled={isLoading || !inputMessage.trim()}
                style={{
                  backgroundColor: '#f97316',
                  color: 'white',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '0.5rem',
                  border: 'none',
                  cursor: inputMessage.trim() && !isLoading ? 'pointer' : 'not-allowed',
                  opacity: isLoading || !inputMessage.trim() ? 0.5 : 1,
                  transition: 'all 0.15s ease',
                  fontSize: '0.875rem'
                }}
                onMouseOver={(e) => {
                  if (inputMessage.trim() && !isLoading) {
                    e.target.style.backgroundColor = '#ea580c';
                  }
                }}
                onMouseOut={(e) => {
                  e.target.style.backgroundColor = '#f97316';
                }}
              >
                <Send style={{ width: '1.25rem', height: '1.25rem' }} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-0.375rem); }
        }
      `}</style>
    </div>
  );
};

export default AlkostoProductAdvisor;