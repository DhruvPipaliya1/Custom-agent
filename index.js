import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { ChatGroq } from '@langchain/groq';
import { StateGraph } from '@langchain/langgraph';
import { MessagesAnnotation } from '@langchain/langgraph';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import readline from 'node:readline/promises';
import "dotenv/config";


//LLM Initialization
const llm = new ChatGroq({
    model: "openai/gpt-oss-120b",
    temperature: 0,
    maxRetries: 2,
});


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


//Build Langgraph Workflow
const workflow = new StateGraph(MessagesAnnotation).addNode("agent", callModel).addEdge('__start__', 'agent').addEdge('agent', '__end__');

const app = workflow.compile();

async function main(){
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    
    // With MessagesAnnotation, the internal state manages the history, 
    // we don't need a local 'state' variable to accumulate history.

    while(true){
        const userInput = await rl.question('You:');
        if(userInput == '/bye') break;

        // Pass the new message wrapped in the required { messages: [...] } object
        const finalState = await app.invoke({
            messages: [new HumanMessage(userInput)],
        });

        // finalState is an object { messages: [...] }
        console.log('Final: ', finalState.messages.at(-1).content);
    }

    rl.close();
}

main();
