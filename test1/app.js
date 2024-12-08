import { OpenAI } from "@langchain/openai";
import { HNSWLib } from "@langchain/community/vectorstores/hnswlib";
import { OpenAIEmbeddings } from "@langchain/openai";
import { RetrievalQAChain } from "langchain/chains";
import { TextLoader } from "langchain/document_loaders/fs/text";
import  dotenv from 'dotenv';
import express from 'express'

dotenv.config()
//console.log(process.env)

const documentVectorStores = {}; // To map documentId to its vector store

// Function to upload a document and return a documentId
async function uploadDocument(filePath) {
  const loader = new TextLoader(filePath);
  const documents = await loader.load();

  // Generate a unique document ID (could be UUID or hash of file)
  const documentId = `doc-${Date.now()}`;

  // Create a vector store for the document
  const embeddings = new OpenAIEmbeddings({
    openAIApiKey: process.env.OPENAI_API_KEY,

  });
  const vectorStore = await HNSWLib.fromDocuments(documents, embeddings);

  // Store the vector store with its document ID
  documentVectorStores[documentId] = vectorStore;

  return documentId;
}

// Function to answer a question based on a specific documentId
async function askQuestion(documentId, question) {
  // Retrieve the vector store for the given document ID
  const vectorStore = documentVectorStores[documentId];
  if (!vectorStore) {
    throw new Error(`No document found for documentId: ${documentId}`);
  }

  // Configure retriever
  const retriever = vectorStore.asRetriever();

  // Initialize the OpenAI model
  const model = new OpenAI({   openAIApiKey: process.env.OPENAI_API_KEY,
 temperature: 0 });

  // Create the Retrieval-QA Chain
  const chain = RetrievalQAChain.fromLLM(model, retriever);

  // Ask the questio
  const response = await chain.call({ query: question });

  return response;
}

// Example Usage
// (async () => {
//   try {
//     // Upload multiple documents
//   //  const documentId1 = await uploadDocument("./documents/doc1.txt");
//     const documentId1 = await uploadDocument("rawText.txt");

//     console.log("Uploaded Document IDs:", documentId1);

//     // Ask a question in the context of a specific document
//     const question = "What is the selers and buys names and id in JSON format?";
//     const answer1 = await askQuestion(documentId1, question);
//     console.log(`Answer for ${documentId1}:`, answer1);

//     // const answer2 = await askQuestion(documentId2, question);
//     // console.log(`Answer for ${documentId2}:`, answer2);
//   } catch (err) {
//     console.error("Error:", err);
//   }
// })();




// Initialize the Express app
const app = express();

// Middleware to parse JSON request bodies
app.use(express.json());

// Simple POST endpoint
app.post("/api/load", async (req, res) => {
  // Access the data sent in the request body
  const { path } = req.body;
  const documentId1 = await uploadDocument(path);

  console.log("Uploaded Document IDs:", documentId1);
  

  // Basic validation
  if (!path) {
    return res.status(400).json({ message: "Name and age are required!" });
  }

  // Send a response back to the client
  res.status(200).json({
    success: true,
    docId: documentId1
    
  });
});

app.post("/api/question", async(req, res) => {
  // Access the data sent in the request body
  const { question, docId } = req.body;



  // Basic validation
  if (!question || !docId) {
    return res.status(400).json({ message: "Name and age are required!" });
  }

  const answer1 = await askQuestion(docId, question);
  console.log(`Answer for ${docId}:`, answer1);

  // Send a response back to the client
  res.status(200).json({
    status: true,
    answer: answer1,
  });
});

// Start the server
const PORT = 3100;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});