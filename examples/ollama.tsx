import {useState} from 'react';
import {Provider, useDispatch, useSelector} from 'react-redux';

import { createSlice, createAsyncThunk, PayloadAction, configureStore } from '@reduxjs/toolkit';
import ollama from 'ollama';

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

export interface OllamaState {
  discussions: Discussion[];
  currentDiscussionId: string;
  isProcessing: boolean;
  error: string | null;
  streamingResponse: string | null;
}

function throttle(fn: (...args: any[]) => void, delay: number) {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return (...args: any[]) => {
    if (!timeout) {
      timeout = setTimeout(() => {
        fn(...args);
        timeout = null;
      }, delay);
    }
  };
}

const initialDiscussionId = crypto.randomUUID();

const AVAILABLE_MODELS = ['3.1', '3.2', '3.3'] as const;
type LlamaVersion = typeof AVAILABLE_MODELS[number];

const DEFAULT_MODEL = '3.1';

const initialState: OllamaState = {
  discussions: [{id: initialDiscussionId, title: null, messages: [], model: DEFAULT_MODEL}],
  currentDiscussionId: initialDiscussionId,
  isProcessing: false,
  error: null,
  streamingResponse: null,
};

export const sendMessage = createAsyncThunk(
  'ollama/sendMessage',
  async ({ content, discussionId }: { content: string, discussionId: string }, { getState, dispatch }) => {
    const state = getState() as { ollama: OllamaState };
    const discussion = state.ollama.discussions.find(d => d.id === discussionId)!;

    console.log(`Sending message to ${discussion.model} model`);

    const stream = await ollama.chat({
      model: `llama${discussion.model}`,
      messages: [
        { role: 'system', content: 'Hello! I\'m going to ask you various questions, on a wide range of topics. Please answer me the best you can, in a friendly and engaging manner. Note: IF you need to return a list (and only if necessary, don\'t force yourself to write a list if it\'s not needed), make sure to prefix each item with a dash, and to add a blank newline inbetween two items. Thanks!' },
        ...discussion.messages.map(msg => ({
          role: msg.role,
          content: msg.content,
        })),
        { role: 'user' as const, content }
      ],
      stream: true
    });

    dispatch(ollamaSlice.actions.startStreamingResponse({discussionId}));

    let batchedContent = '';

    const throttledUpdateStreamingResponse = throttle(() => {
      dispatch(ollamaSlice.actions.updateStreamingResponse({discussionId, content: batchedContent}));
      batchedContent = '';
    }, 100);

    for await (const part of stream) {
      batchedContent += part.message.content;
      throttledUpdateStreamingResponse();
    }
  }
);

export const generateTitle = createAsyncThunk(
  'ollama/generateTitle',
  async ({ discussionId }: { discussionId: string }, { getState }) => {
    const state = getState() as { ollama: OllamaState };
    const discussion = state.ollama.discussions.find(d => d.id === discussionId)!;

    const firstMessage = discussion.messages[0].content;
    const response = discussion.messages[1].content;

    const titleResponse = await ollama.chat({
      model: `llama${DEFAULT_MODEL}`,
      messages: [
        { role: 'system', content: 'You are a title generator. Respond with just the title, no quotes or explanation.' },
        { role: 'user', content: `Based on this conversation, generate a very short title (max 30 chars):\nUser: ${firstMessage}\nAssistant: ${response}` }
      ],
      stream: false
    });

    return {
      title: titleResponse.message.content.slice(0, 30),
      discussionId
    };
  }
);

const ollamaSlice = createSlice({
  name: 'ollama',
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
    setDiscussionModel: (state, action: PayloadAction<{discussionId: string, model: LlamaVersion}>) => {
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
    }
  },
  extraReducers: (builder) => {
    builder.addCase(sendMessage.pending, (state, action) => {
      const userMessage: Message = {role: 'user', content: action.meta.arg.content};

      const discussion = state.discussions.find(d => d.id === action.meta.arg.discussionId)!;
      discussion.messages.push(userMessage);

      state.isProcessing = true;
      state.error = null;
    });

    builder.addCase(sendMessage.fulfilled, (state, action) => {
      state.isProcessing = false;
    });

    builder.addCase(sendMessage.rejected, (state, action) => {
      state.isProcessing = false;
      state.error = action.error.message ?? 'Failed to connect to Ollama. Make sure it is running locally.';
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
} = ollamaSlice.actions;

const store = configureStore({
  reducer: {
    ollama: ollamaSlice.reducer,
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

// Note: should move that to term-strings
const hyperlink = (text: string, url: string) => {
  return `\x1b]8;;${url}\x07${text}\x1b]8;;\x07`;
};

function OllamaApp() {
  const [input, setInput] = useState('');
  const dispatch = useAppDispatch();
  
  const discussions = useAppSelector((state: RootState) => state.ollama.discussions);
  const currentDiscussionId = useAppSelector((state: RootState) => state.ollama.currentDiscussionId);
  const isProcessing = useAppSelector((state: RootState) => state.ollama.isProcessing);
  const error = useAppSelector((state: RootState) => state.ollama.error);
  const streamingResponse = useAppSelector((state: RootState) => state.ollama.streamingResponse);
  
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

    await dispatch(sendMessage({
      content: trimmedInput,
      discussionId: currentDiscussionId,
    })).unwrap();

    // If this is the first message exchange, generate a title
    if (currentDiscussion.title === null) {
      dispatch(generateTitle({
        discussionId: currentDiscussionId,
      }));
    }
  };

  return (
    <term:div flexDirection="row" width="100%" height="100%">
      {/* Discussions list */}
      <term:div width={30} border="modern" overflow="scroll" flexDirection="column">
        <term:div paddingLeft={1} paddingRight={1} marginBottom={1} flexDirection="row" alignItems="center">
          <term:text>Model: </term:text>
          {AVAILABLE_MODELS.map((model) => (
            <term:div
              key={model}
              marginLeft={1}
              backgroundColor={currentDiscussion.model === model ? 'blue' : undefined}
              onClick={() => dispatch(ollamaSlice.actions.setDiscussionModel({discussionId: currentDiscussionId, model}))}
            >
              <term:text>{model}</term:text>
            </term:div>
          ))}
        </term:div>

        {discussions.map((discussion) => (
          <term:div key={discussion.id} paddingLeft={1} paddingRight={1} backgroundColor={discussion.id === currentDiscussionId ? 'blue' : undefined} onClick={() => dispatch(setCurrentDiscussion(discussion.id))}>
            <term:text fontStyle={discussion.title ? undefined : `italic`}>{discussion.title ?? `Untitled`}</term:text>
          </term:div>
        ))}
      </term:div>

      <term:div flex={1} flexDirection="column">
        <term:div flex={1} border="modern" overflow="scroll" paddingLeft={1} paddingRight={1}>
          {currentDiscussion.messages.length === 0 && (
            <term:div flexDirection="column">
              <term:text color="yellow" fontWeight="bold" marginBottom={1}>Welcome to the Terminosaurus Ollama Chat!</term:text>
              <term:text marginBottom={1}>This is a terminal-based chat interface for {hyperlink(`Ollama`, `https://ollama.ai/`)}. To use this application:</term:text>
              <term:text marginBottom={1}>1. Make sure Ollama is installed and running locally</term:text>
              <term:text marginBottom={1}>2. Run "launchctl setenv OLLAMA_HOST 127.0.0.1" to allow CORS requests</term:text>
              <term:text marginBottom={1}>3. Type your message in the input box below and press Enter</term:text>
              <term:text marginBottom={1}>4. Use /new to start a new conversation</term:text>
              <term:text marginBottom={1}>5. Select your preferred model version at the top of the discussions list</term:text>
              <term:text color="gray">Note: This application requires Ollama to be running locally with the llama{currentDiscussion.model} model installed.</term:text>
            </term:div>
          )}
          
          {currentDiscussion.messages.map((message, index) => (
            <term:div key={`${index}`} marginBottom={1}>
              <term:text color={message.role === 'user' ? 'green' : 'blue'} fontWeight="bold">
                {message.role === 'user' ? 'You' : 'Ollama'}:
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
          
          {streamingResponse !== null && (
            <term:div marginBottom={1}>
              <term:text color="blue" fontWeight="bold">Ollama: </term:text>
              <term:text whiteSpace="preLine">{streamingResponse}</term:text>
            </term:div>
          )}
          
          {isProcessing && !streamingResponse && (
            <term:div>
              <term:text fontStyle={`italic`} color="yellow">Ollama is thinking...</term:text>
            </term:div>
          )}
        </term:div>

        <term:form border="modern" paddingLeft={1} paddingRight={1} onSubmit={handleSubmit}>
          <term:input decorated={true} text={input} onChange={e => setInput(e.target.text)}/>
        </term:form>
      </term:div>
    </term:div>
  );
}

export function App() {
  return (
    <Provider store={store}>
      <OllamaApp />
    </Provider>
  );
} 
