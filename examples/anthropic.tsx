import {useEffect, useState} from 'react';
import {Provider, useDispatch, useSelector} from 'react-redux';
import { createSlice, createAsyncThunk, PayloadAction, configureStore } from '@reduxjs/toolkit';
import Anthropic from '@anthropic-ai/sdk';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface Discussion {
  id: string;
  title: string | null;
  messages: Message[];
  model: string;
}

export interface AnthropicState {
  discussions: Discussion[];
  currentDiscussionId: string;
  isProcessing: boolean;
  error: string | null;
  apiKey: string | null;
  showKeyModal: boolean;
}

const PROMPT = `
You are an helpful assistant. You will answer me in a friendly and engaging tone.

If you need to give me a list (and only if you need to, please don't turn everything into a list!), make sure to prefix each item with a dash, AND to add an empty line between each item.

Please try to answer in less than 200 words.
`.trimStart();

const STORAGE_KEY = 'anthropic_api_key';
const savedApiKey = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;

const initialDiscussionId = crypto.randomUUID();

const AVAILABLE_MODELS = ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'] as const;
type ModelVersion = typeof AVAILABLE_MODELS[number];
const DEFAULT_MODEL = 'claude-3-sonnet-20240229';

const initialState: AnthropicState = {
  discussions: [{id: initialDiscussionId, title: null, messages: [], model: DEFAULT_MODEL}],
  currentDiscussionId: initialDiscussionId,
  isProcessing: false,
  error: null,
  apiKey: savedApiKey,
  showKeyModal: false,
};

function throttle(fn: () => void, delay: number) {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return (force: boolean = false) => {
    if (force) {
      if (timeout)
        clearTimeout(timeout);

      fn();
      return;
    }

    if (timeout)
      return;

    timeout = setTimeout(() => {
      timeout = null;
      fn();
    }, delay);
  };
}

function getAnthropicClient(apiKey: string) {
  return new Anthropic({
    apiKey,
    defaultHeaders: {
      [`anthropic-dangerous-direct-browser-access`]: `true`,
    },
  });
}

export const sendMessage = createAsyncThunk(
  'anthropic/sendMessage',
  async ({ discussionId }: { content: string, discussionId: string }, { getState, dispatch }) => {
    const state = getState() as { anthropic: AnthropicState };
    if (!state.anthropic.apiKey)
      throw new Error('API key not set');

    const discussion = state.anthropic.discussions.find(d => d.id === discussionId)!;
    const anthropic = getAnthropicClient(state.anthropic.apiKey);

    const stream = await anthropic.messages.create({
      model: discussion.model,
      system: PROMPT,
      messages: discussion.messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      })),
      max_tokens: 4096,
      stream: true,
    });

    let content = '';

    const throttledDispatch = throttle(() => {
      dispatch(anthropicSlice.actions.updateStreamingResponse({discussionId, content}));
      content = '';
    }, 100);

    let isFirst = true;

    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta.text) {
        if (isFirst) {
          dispatch(anthropicSlice.actions.startStreamingResponse({discussionId}));
          isFirst = false;
        }

        content += chunk.delta.text;
        throttledDispatch();
      }
    }

    throttledDispatch(true);

    if (discussion.title === null) {
      dispatch(generateTitle({
        discussionId,
      }));
    }
  }
);

export const generateTitle = createAsyncThunk(
  'anthropic/generateTitle',
  async ({ discussionId }: { discussionId: string }, { getState }) => {
    const state = getState() as { anthropic: AnthropicState };
    if (!state.anthropic.apiKey) {
      throw new Error('API key not set');
    }

    const discussion = state.anthropic.discussions.find(d => d.id === discussionId)!;
    const anthropic = getAnthropicClient(state.anthropic.apiKey);

    const firstMessage = discussion.messages[0].content;
    const response = discussion.messages[1].content;

    const titleResponse = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      messages: [
        { role: 'user', content: 'You are a title generator. Respond with just the title, no quotes or explanation.' },
        { role: 'user', content: `Based on this conversation, generate a very short title (max 30 chars):\nUser: ${firstMessage}\nAssistant: ${response}` }
      ],
      max_tokens: 100,
    });

    return {
      title: titleResponse.content[0].text.slice(0, 30),
      discussionId
    };
  }
);

const anthropicSlice = createSlice({
  name: 'anthropic',
  initialState,
  reducers: {
    createNewDiscussion: (state) => {
      const newId = crypto.randomUUID();
      state.discussions.push({id: newId, title: null, messages: [], model: DEFAULT_MODEL});
      state.currentDiscussionId = newId;
      state.error = null;
    },
    setCurrentDiscussion: (state, action: PayloadAction<string>) => {
      state.currentDiscussionId = action.payload;
      state.error = null;
    },
    setDiscussionModel: (state, action: PayloadAction<{discussionId: string, model: ModelVersion}>) => {
      const discussion = state.discussions.find(d => d.id === action.payload.discussionId)!;
      discussion.model = action.payload.model;
    },
    startStreamingResponse: (state, action: PayloadAction<{discussionId: string}>) => {
      const discussion = state.discussions.find(d => d.id === action.payload.discussionId)!;

      const assistantMessage: Message = {role: 'assistant', content: ''};
      discussion.messages.push(assistantMessage);
    },
    updateStreamingResponse: (state, action: PayloadAction<{discussionId: string, content: string}>) => {
      const discussion = state.discussions.find(d => d.id === action.payload.discussionId)!;

      const assistantMessage = discussion.messages[discussion.messages.length - 1];
      assistantMessage.content += action.payload.content;
    },
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
    },
    setApiKey: (state, action: PayloadAction<string>) => {
      state.apiKey = action.payload;
      state.showKeyModal = false;
    },
    openKeyModal: (state) => {
      state.showKeyModal = true;
    },
    closeKeyModal: (state) => {
      state.showKeyModal = false;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(sendMessage.pending, (state, action) => {
      const discussion = state.discussions.find(d => d.id === action.meta.arg.discussionId)!;
      discussion.messages.push({role: 'user', content: action.meta.arg.content});

      state.isProcessing = true;
      state.error = null;
    });

    builder.addCase(sendMessage.fulfilled, (state, action) => {
      state.isProcessing = false;
    });

    builder.addCase(sendMessage.rejected, (state, action) => {
      state.isProcessing = false;
      state.error = action.error.message ?? 'Failed to connect to Anthropic. Make sure it is running locally.';
    });

    builder.addCase(generateTitle.fulfilled, (state, action) => {
      const discussion = state.discussions.find(d => d.id === action.payload.discussionId)!;
      discussion.title = action.payload.title;
    });

    builder.addCase(generateTitle.rejected, (state, action) => {
      state.error = action.error.message ?? 'Failed to generate title.';
    });
  },
});

const {
  createNewDiscussion,
  setCurrentDiscussion,
  setError,
} = anthropicSlice.actions;

const store = configureStore({
  reducer: {
    anthropic: anthropicSlice.reducer,
  },
});

type RootState = ReturnType<typeof store.getState>;
type AppDispatch = typeof store.dispatch; 

function useAppSelector<T>(selector: (state: RootState) => T) {
  return useSelector(selector);
}

function useAppDispatch() {
  return useDispatch<AppDispatch>();
}

function ProgressDots() {
  const [dots, setDots] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(dots => dots === 2 ? 0 : dots + 1);
    }, 500);

    return () => clearInterval(interval);
  }, []);

  return `.`.repeat(dots + 1);
}

function KeyModal({ onClose }: { onClose: () => void }) {
  const [key, setKey] = useState('');
  const [rememberKey, setRememberKey] = useState(false);
  const dispatch = useAppDispatch();

  const handleSubmit = () => {
    if (rememberKey && typeof localStorage !== 'undefined')
      localStorage.setItem(STORAGE_KEY, key);

    dispatch(anthropicSlice.actions.setApiKey(key));
    onClose();
  };

  return (
    <term:div
      position="absolute"
      inset={10}
      backgroundColor="black"
      border="modern"
      flexDirection="column"
      padding={1}
    >
      <term:text color="yellow" fontWeight="bold" marginBottom={1}>Enter your Anthropic API Key</term:text>
      <term:text marginBottom={1}>Your key will only be used locally to make API calls.</term:text>
      <term:text marginBottom={1}>It will never be transmitted to any other server.</term:text>
      
      <term:form onSubmit={handleSubmit} marginBottom={1}>
        <term:input
          decorated={true}
          text={key}
          secret={true}
          onChange={e => setKey(e.target.text)}
        />
      </term:form>

      <term:div flexDirection="row" alignItems="center" marginBottom={1}>
        <term:div
          backgroundColor={rememberKey ? 'blue' : undefined}
          onClick={() => setRememberKey(!rememberKey)}
          paddingRight={1}
        >
          <term:text>[{rememberKey ? 'X' : ' '}] Remember this key into localStorage</term:text>
        </term:div>
      </term:div>

      <term:div flexDirection="row" marginLeft="auto">
        <term:div backgroundColor="blue" onClick={handleSubmit}>
          <term:text paddingLeft={1} paddingRight={1}>Save</term:text>
        </term:div>
        <term:div marginLeft={1} backgroundColor="red" onClick={onClose}>
          <term:text paddingLeft={1} paddingRight={1}>Cancel</term:text>
        </term:div>
      </term:div>
    </term:div>
  );
}

// Note: should move that to term-strings
const hyperlink = (text: string, url: string) => {
  return `\x1b]8;;${url}\x07${text}\x1b]8;;\x07`;
};

function AnthropicApp() {
  const [input, setInput] = useState('');
  const dispatch = useAppDispatch();
  
  const discussions = useAppSelector((state: RootState) => state.anthropic.discussions);
  const currentDiscussionId = useAppSelector((state: RootState) => state.anthropic.currentDiscussionId);
  const isProcessing = useAppSelector((state: RootState) => state.anthropic.isProcessing);
  const error = useAppSelector((state: RootState) => state.anthropic.error);
  const apiKey = useAppSelector((state: RootState) => state.anthropic.apiKey);
  const showKeyModal = useAppSelector((state: RootState) => state.anthropic.showKeyModal);
  
  const currentDiscussion = discussions.find(d => d.id === currentDiscussionId)!;

  const handleSubmit = async () => {
    if (!input.trim() || isProcessing)
      return;

    const trimmedInput = input.trim();

    if (trimmedInput.startsWith('/')) {
      if (trimmedInput === '/new') {
        dispatch(createNewDiscussion());
      } else {
        dispatch(setError(`Unknown command: ${trimmedInput}`));
        setInput('');
      }

      return;
    }

    setInput('');

    dispatch(sendMessage({
      content: trimmedInput,
      discussionId: currentDiscussionId,
    }));
  };

  const handleLogout = () => {
    if (typeof localStorage !== 'undefined')
      localStorage.removeItem(STORAGE_KEY);

    dispatch(anthropicSlice.actions.setApiKey(''));
  };

  return (
    <term:div flexDirection="column" width="100%" height="100%" onClick={e => e.target.rootNode.queueDirtyRect()}>
      {!apiKey ? (
        <term:div height={1} backgroundColor="yellow" onClick={() => dispatch(anthropicSlice.actions.openKeyModal())}>
          <term:text color="black" paddingLeft={1} paddingRight={1}>
            Click here to set your Anthropic API key and start chatting!
          </term:text>
        </term:div>
      ) : (
        <term:div height={1} backgroundColor="gray" flexDirection="row">
          <term:text flex={1} color="white" paddingLeft={1}>
            Connected as Anthropic User
          </term:text>
          <term:div marginLeft={1} marginRight={1} paddingLeft={1} paddingRight={1} backgroundColor="darkGray" onClick={handleLogout}>
            Logout
          </term:div>
        </term:div>
      )}

      <term:div flex={1} flexDirection="row" width="100%" position="relative">
        <term:div width={30} flexDirection="column">
          {/* Discussions list */}
          <term:div border="modern" overflow="scroll" flexDirection="column">
            {AVAILABLE_MODELS.map((model) => (
              <term:div
                key={model}
                paddingLeft={1}
                paddingRight={1}
                backgroundColor={currentDiscussion.model === model ? 'blue' : undefined}
                onClick={() => dispatch(anthropicSlice.actions.setDiscussionModel({discussionId: currentDiscussionId, model}))}
              >
                <term:text>{model}</term:text>
              </term:div>
            ))}
          </term:div>

          <term:div flex={1} border="modern" flexDirection="column">
            {discussions.map((discussion) => (
              <term:div key={discussion.id} paddingLeft={1} paddingRight={1} backgroundColor={discussion.id === currentDiscussionId ? 'blue' : undefined} onClick={() => dispatch(setCurrentDiscussion(discussion.id))}>
                <term:text fontStyle={discussion.title ? undefined : `italic`}>{discussion.title ?? `Untitled`}</term:text>
              </term:div>
            ))}
          </term:div>
        </term:div>

        <term:div flex={1} flexDirection="column">
          <term:div flex={1} border="modern" overflow="scroll" alwaysScrollToBottom={true} paddingLeft={1} paddingRight={1}>
            {currentDiscussion.messages.length === 0 && !isProcessing && (
              <term:div flexDirection="column">
                <term:text color="yellow" fontWeight="bold" marginBottom={1}>Welcome to the Terminosaurus Anthropic Chat!</term:text>
                <term:text marginBottom={1}>This is a terminal-based chat interface for {hyperlink(`Anthropic`, `https://anthropic.com/`)}. To use this application:</term:text>
                <term:text marginBottom={1}>1. Click the yellow banner to set your API key</term:text>
                <term:text marginBottom={1}>2. Type your message in the input box below and press Enter</term:text>
                <term:text marginBottom={1}>3. Use /new to start a new conversation</term:text>
                <term:text color="gray">Note: The Anthropic API key is only used locally to make API calls. It will never be transmitted to any other server.</term:text>
              </term:div>
            )}

            {currentDiscussion.messages.map((message, index) => (
              <term:div key={`${index}`} marginBottom={1}>
                <term:text color={message.role === 'user' ? 'green' : 'blue'} fontWeight="bold">
                  {message.role === 'user' ? 'You' : 'Anthropic'}:
                </term:text>
                <term:text whiteSpace="preLine">
                  {message.content}
                </term:text>
              </term:div>
            ))}

            {error && (
              <term:div marginBottom={1}>
                <term:text color="red" fontWeight="bold">{error}</term:text>
              </term:div>
            )}

            {isProcessing && (
              <term:div>
                <term:text fontStyle={`italic`} color="yellow">Anthropic is thinking<ProgressDots/></term:text>
              </term:div>
            )}
          </term:div>

          <term:form border="modern" paddingLeft={1} paddingRight={1} onSubmit={handleSubmit}>
            <term:input decorated={true} text={input} onChange={e => setInput(e.target.text)}/>
          </term:form>
        </term:div>
      </term:div>

      {showKeyModal && (
        <KeyModal onClose={() => dispatch(anthropicSlice.actions.closeKeyModal())} />
      )}
    </term:div>
  );
};

export function App() {
  return (
    <Provider store={store}>
      <AnthropicApp />
    </Provider>
  );
} 
