import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  List,
  ListItem,
  Paper,
  Typography,
  CircularProgress,
  IconButton,
  Tooltip,
  Chip,
  Divider
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import ClearIcon from '@mui/icons-material/Clear';
import axios from 'axios';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatInterfaceProps {
  sessionId: string;
  onViewerCommand?: (command: any) => Promise<boolean>;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ sessionId, onViewerCommand }) => {
  // LocalStorageから会話履歴を復元
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const saved = localStorage.getItem(`bim_chat_${sessionId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        // タイムスタンプを文字列からDateオブジェクトに変換
        return parsed.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }));
      }
      return [];
    } catch (error) {
      console.warn('Failed to load chat history from localStorage:', error);
      return [];
    }
  });
  
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // メッセージが更新されたときにLocalStorageに保存
  useEffect(() => {
    try {
      localStorage.setItem(`bim_chat_${sessionId}`, JSON.stringify(messages));
    } catch (error) {
      console.warn('Failed to save chat history to localStorage:', error);
    }
    scrollToBottom();
  }, [messages, sessionId]);

  // セッション管理とクリーンアップ
  useEffect(() => {
    // 古いチャット履歴をクリーンアップ（最大5セッション保持）
    const cleanupOldSessions = () => {
      try {
        const chatKeys = Object.keys(localStorage).filter(key => key.startsWith('bim_chat_'));
        
        if (chatKeys.length > 5) {
          // 古いセッションを削除（日付順でソートして古いものから削除）
          const sessionsWithTime = chatKeys.map(key => {
            try {
              const data = JSON.parse(localStorage.getItem(key) || '[]');
              const lastMessage = data[data.length - 1];
              return {
                key,
                timestamp: lastMessage ? new Date(lastMessage.timestamp).getTime() : 0
              };
            } catch {
              return { key, timestamp: 0 };
            }
          }).sort((a, b) => a.timestamp - b.timestamp);

          // 古いセッションを削除
          sessionsWithTime.slice(0, chatKeys.length - 5).forEach(session => {
            localStorage.removeItem(session.key);
          });
        }
      } catch (error) {
        console.warn('Failed to cleanup old chat sessions:', error);
      }
    };

    cleanupOldSessions();
  }, [sessionId]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL || 'http://localhost:8001'}/chat`,
        {
          session_id: sessionId,
          question: input,
          conversation_history: messages  // 会話履歴を送信
        }
      );

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: response.data.response,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Handle visual command if present
      if (response.data.visual_command && onViewerCommand) {
        const success = await onViewerCommand(response.data.visual_command);
        if (!success) {
          const errorMessage: Message = {
            id: (Date.now() + 2).toString(),
            type: 'assistant',
            content: 'ビジュアルコマンドの実行に失敗しました。',
            timestamp: new Date()
          };
          setMessages(prev => [...prev, errorMessage]);
        }
      }
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: 'エラーが発生しました。もう一度お試しください。',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };


  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClearHistory = () => {
    setMessages([]);
    try {
      localStorage.removeItem(`bim_chat_${sessionId}`);
    } catch (error) {
      console.warn('Failed to clear chat history:', error);
    }
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        p: 3,
        borderBottom: '1px solid',
        borderColor: 'grey.200',
        flexShrink: 0
      }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary', mb: 0.5 }}>
            AI Building Consultant
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Ask questions about building analysis and optimization
          </Typography>
        </Box>
        {messages.length > 0 && (
          <Tooltip title="Clear conversation">
            <IconButton 
              size="small" 
              onClick={handleClearHistory}
              sx={{ 
                color: 'text.secondary',
                '&:hover': { color: 'text.primary' }
              }}
            >
              <ClearIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Box>
      
      {/* Sample Questions */}
      {messages.length === 0 && (
        <Box sx={{ 
          px: 3, 
          py: 2,
          bgcolor: 'grey.50',
          maxHeight: '200px',
          overflow: 'auto',
          flexShrink: 0,
          borderBottom: '1px solid',
          borderColor: 'grey.200'
        }}>
          <Typography 
            variant="caption" 
            sx={{ 
              color: 'text.secondary',
              fontWeight: 600,
              letterSpacing: '0.1em',
              display: 'block',
              mb: 1.5
            }}
          >
            質問例をクリックして始めましょう
          </Typography>
          
          {/* Building Analysis Questions */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>
              建物分析・評価
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {[
                'この建物の設計を分析',
                '建物の用途は？',
                'エネルギー効率評価',
                '法規制チェック',
                '空間最適化',
                'コスト分析'
              ].map((question, index) => (
                <Chip
                  key={index}
                  label={question}
                  onClick={() => setInput(
                    index === 0 ? 'この建物の設計を分析してください' :
                    index === 1 ? 'この建物は何に適していますか？' :
                    index === 2 ? 'エネルギー効率を評価してください' :
                    index === 3 ? '建築基準法への適合性をチェック' :
                    index === 4 ? '空間利用の最適化について' :
                    'コスト分析をお願いします'
                  )}
                  size="small"
                  sx={{ 
                    cursor: 'pointer',
                    '&:hover': {
                      bgcolor: 'primary.main',
                      color: 'white'
                    }
                  }}
                />
              ))}
            </Box>
          </Box>

          <Divider sx={{ my: 1.5 }} />

          {/* Visual Commands */}
          <Box>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>
              ビジュアルコマンド
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {[
                { label: '壁を赤に', cmd: '壁を赤色にして' },
                { label: '窓を青に', cmd: '窓を青にして' },
                { label: 'ドアを緑に', cmd: 'ドアを緑色に変更' },
                { label: '2階のみ', cmd: '2階だけ表示して' },
                { label: '窓を隠す', cmd: '窓を隠して' },
                { label: 'ハイライト', cmd: '壁をハイライトして' },
                { label: '上から見る', cmd: '建物を上から見て' },
                { label: '半透明', cmd: '壁を半透明にして' },
                { label: 'リセット', cmd: 'リセットして' }
              ].map((item) => (
                <Chip
                  key={item.label}
                  label={item.label}
                  onClick={() => setInput(item.cmd)}
                  size="small"
                  variant="outlined"
                  sx={{ 
                    cursor: 'pointer',
                    borderColor: 'primary.main',
                    color: 'primary.main',
                    '&:hover': {
                      bgcolor: 'primary.main',
                      color: 'white'
                    }
                  }}
                />
              ))}
            </Box>
          </Box>
        </Box>
      )}
      
      
      <Box sx={{ flex: 1, overflow: 'auto', px: 3, pb: 2 }}>
        {messages.length === 0 ? (
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            minHeight: '200px',
            color: 'text.secondary'
          }}>
            <Typography variant="body2">
              Start a conversation about your building analysis
            </Typography>
          </Box>
        ) : (
          <List sx={{ py: 0, minHeight: 'auto', height: 'auto' }}>
            {messages.map((message) => (
              <ListItem
                key={message.id}
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: message.type === 'user' ? 'flex-end' : 'flex-start',
                  mb: 3,
                  px: 0,
                  minHeight: 'auto',
                  height: 'auto'
                }}
              >
                <Paper
                  elevation={0}
                  sx={{
                    p: 3,
                    width: message.type === 'user' ? '85%' : '95%',
                    backgroundColor: message.type === 'user' 
                      ? 'primary.main' 
                      : 'background.paper',
                    color: message.type === 'user' ? 'white' : 'text.primary',
                    border: message.type === 'assistant' ? '1px solid' : 'none',
                    borderColor: 'grey.200',
                    borderRadius: 2,
                    boxShadow: message.type === 'user' 
                      ? '0 2px 8px rgba(27, 54, 93, 0.15)' 
                      : '0 1px 3px rgba(0, 0, 0, 0.05)'
                  }}
                >
                  <Typography 
                    variant="body1" 
                    sx={{ 
                      whiteSpace: 'pre-wrap',
                      lineHeight: 1.6,
                      fontWeight: message.type === 'user' ? 500 : 400,
                      wordBreak: 'break-word',
                      overflowWrap: 'break-word'
                    }}
                  >
                    {message.content}
                  </Typography>
                </Paper>
                <Typography 
                  variant="caption" 
                  sx={{ 
                    mt: 0.5,
                    color: 'text.secondary',
                    fontSize: '0.7rem'
                  }}
                >
                  {message.timestamp.toLocaleTimeString()}
                </Typography>
              </ListItem>
            ))}
            {loading && (
              <ListItem sx={{ justifyContent: 'flex-start', px: 0 }}>
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 2,
                  p: 2,
                  bgcolor: 'grey.50',
                  borderRadius: 2
                }}>
                  <CircularProgress size={16} />
                  <Typography variant="body2" color="text.secondary">
                    AI is analyzing...
                  </Typography>
                </Box>
              </ListItem>
            )}
            <div ref={messagesEndRef} />
          </List>
        )}
      </Box>

      <Box sx={{ 
        p: 3, 
        borderTop: '1px solid',
        borderColor: 'grey.200',
        bgcolor: 'background.paper',
        flexShrink: 0
      }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-end' }}>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Ask about building design, analysis, optimization..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={loading}
            multiline
            maxRows={3}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
                bgcolor: 'grey.50',
                '&:hover': {
                  bgcolor: 'background.paper'
                },
                '&.Mui-focused': {
                  bgcolor: 'background.paper'
                }
              }
            }}
          />
          <Button
            variant="contained"
            onClick={handleSend}
            disabled={!input.trim() || loading}
            sx={{
              minWidth: 'auto',
              px: 3,
              py: 1.5,
              borderRadius: 2
            }}
          >
            <SendIcon />
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default ChatInterface;