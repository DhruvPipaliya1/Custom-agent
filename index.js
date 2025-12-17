import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { ChatGroq } from '@langchain/groq';
import { StateGraph } from '@langchain/langgraph';
import { MessagesAnnotation } from '@langchain/langgraph';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import { MemorySaver } from '@langchain/langgraph';
import readline from 'node:readline/promises';
import "dotenv/config";
import ReactMarkdown from "react-markdown";
import { TavilySearch } from '@langchain/tavily';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
// import cors from 'cors';

const port = 3000;
const app = express();
app.use(express.json());
// app.use(cors());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dirpath = path.join(__dirname, 'public', 'index.html');

const checkpointer = new MemorySaver();

const tool = new TavilySearch({
    maxResults: 3,
    topic: 'general',
})

//Intialise Tools
const tools = [tool];
const toolNode = new ToolNode(tools);

//LLM Initialization
const llm = new ChatGroq({
    model: "openai/gpt-oss-120b",
    temperature: 0,
    maxRetries: 2,
}).bindTools(tools);


//Promt Template
const promptTemplate = ChatPromptTemplate.fromMessages([
    new SystemMessage("You are a helpful assistant."),
    ["placeholder", "{messages}"],
]);


//Calling Model
async function callModel(state) {
    console.log("Calling LLM..");
    const formattedInput = await promptTemplate.formatMessages({ 
        messages: state.messages 
    });
    const response = await llm.invoke(formattedInput);
    return { messages: [response] };
}


//
function shouldContinue(state) {
    const lastMessages = state.messages[state.messages.length - 1];
    if(lastMessages.tool_calls.length > 0){
        return 'tools';
    }
    return '__end__';
}


//Build Langgraph Workflow
const workflow = new StateGraph(MessagesAnnotation)
    .addNode("agent", callModel)
    .addNode("tools", toolNode)
    .addEdge('__start__', 'agent')
    .addEdge('tools', 'agent')
    .addConditionalEdges('agent', shouldContinue);

const zapp = workflow.compile({ checkpointer });

app.get('/',(req, res) => {
    res.sendFile(dirpath);
});

app.listen(port, () => {
    console.log("Run Server...")
});

app.post("/api/chat", async (req, res) => {
    const userInput = req.body.input;
    try{
       // Pass the new message wrapped in the required { messages: [...] } object
        const finalState = await zapp.invoke({
            messages: [new HumanMessage(userInput)],
        },
        {
            configurable: { thread_id: '1' }
        });

        if(finalState.messages.at(-1).content){
            return res.json({ output: finalState.messages.at(-1).content });
        }
        res.status(500).json({output: "Sorry, something went wrong. Please try later."});
    }
    catch(err){
        console.log("Error during execution: ", err);
        res.status(500).json({output: "Sorry, something went wrong. Please try later."});
    }
});

// async function main(){
//     const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    
//     // With MessagesAnnotation, the internal state manages the history, 
//     // we don't need a local 'state' variable to accumulate history.

//     while(true){
//         const userInput = await rl.question('You:');
//         if(userInput == '/bye') break;

//         // Pass the new message wrapped in the required { messages: [...] } object
//         const finalState = await zapp.invoke({
//             messages: [new HumanMessage(userInput)],
//         },
//         {
//             configurable: { thread_id: '1' }
//         });

//         // finalState is an object { messages: [...] }
//         console.log('Final: ', finalState.messages.at(-1).content);
//     }

//     rl.close();
// }

// main();
