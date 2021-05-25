const { SSL_OP_SSLEAY_080_CLIENT_DH_BUG } = require("constants")
const fs = require(`fs`)
const http = require(`http`)
const { callbackify } = require("util")
const WebSocket = require(`ws`)  // npm i ws



const scores = {"A": 2, "B": 5, "C": 3, "D": 3, "E": 1, "F": 5, "G": 4, "H": 4, "I": 2, "J": 10, "K": 6, "L": 3, "M": 4, "N": 2, "O": 2, "P": 4, "Q": 8, "R": 2, "S": 2, "T": 2, "U": 4, "V": 6, "W": 6, "X": 9, "Y": 5, "Z": 8}

let currentBoard = 0
let boardUpadteTime = 60


let topPlayers = {}

const readFile = (fileName) =>
  new Promise((resolve, reject) => {
    fs.readFile(fileName, `utf-8`, (readErr, fileContents) => {
      if (readErr) {
        reject(readErr)
      } else {
        resolve(fileContents)
      }
    })
  })


let myDict = []
const readDict = async () => {
  try {
    let contents = await readFile("dictionary.txt")
    const splitted = contents.split("\n")
    myDict = splitted
  } catch (error) {
    console.log(error)
  }

  
}

readDict()

let myBoards = []
const readBoards = async () => {
  try {
    let contents = await readFile("board.txt")
    const splitted = contents.toUpperCase().split("\r\n")
    splitted[splitted.length-1] = splitted[splitted.length-1].split("\n")[0]
    myBoards = splitted
  } catch (error) {
    console.log(error)
  }

  
}

readBoards()

const delay = (seconds) => 
  new Promise((resolve) => setTimeout(resolve, seconds * 1000))




const server = http.createServer(async (req, resp) => {
    console.log(`browser asked for ${req.url}`)
    if (req.url == `/mydoc`) {
        const clientHtml = await readFile(`client.html`)
        resp.end(clientHtml)
    } else if (req.url == `/myjs`) {
        const clientJs = await readFile(`client.js`)
        resp.end(clientJs)
    } else {
        resp.end(`Not found`)
    }
})

const atleastThree = (indices) => indices.length > 2

const noRepeated = (indices) => {
  for (let i = 0; i < indices.length; i++)
  {
    for (let j = i+1; j < indices.length; j++){
      if (indices[i] === indices[j]){
        return false
      }
    }
  }
  return true
}

const consecutiveAdjacent = (indices) => {
  
  const sequences = {}
  
  indices.forEach((index, i) => {
    if (i === 0){
      sequences[index] = [indices[i+1]]
    } else if (i === indices.length - 1){
      sequences[index] = [indices[i-1]]
    } else {
      sequences[index] = [indices[i-1],indices[i+1]]
    }
  })


  for (let i = 0; i < indices.length; i++) {
    let currIndex = indices[i]
    let currDiv = currIndex/4
    let currMod = currIndex%4

    let possibleIndices = []

    if (currMod !== 3){
      possibleIndices.push(currIndex + 1)
    }

    if (currMod !== 0){
      possibleIndices.push(currIndex - 1)
    }

    if (currDiv !== 0){
      possibleIndices.push(currIndex - 4)
    }
    if (currDiv !== 3){
      possibleIndices.push(currIndex + 4)
    }

    ajacentIndices = sequences[currIndex]

    let check = false

    ajacentIndices.forEach((index) => {
      if (possibleIndices.includes(index) === false){
        check = true
      }
    })

    if (check){
      return false
    }

  }
  return true
}

const calculateScore = (word) => {
  let score = 0
  for(let i = 0; i < word.length;i++){
    score = score + scores[word[i]] 
  }
  return score
}


server.listen(8000)

const wss = new WebSocket.Server({ port: 8080 })

wss.on(`connection`, (ws) => {
  console.log(`A user connected`)
  
  ws.send(JSON.stringify({
    type: "firstnewletters",
    newletters: myBoards[currentBoard],
    secondsleft: boardUpadteTime
  }))
  

  ws.on(`message`, (message) => {
    console.log(`received: ${message}`)
    const clientMessage = JSON.parse(message)

    if (clientMessage.type === "username"){
      ws.username = clientMessage.username
      ws.score = 0
      
    }

    if (clientMessage.type === 'wordindices') {
      
      const indices = clientMessage.wordindices 
      let selectedWord = ""
      indices.forEach((index) => {
        let letters = myBoards[currentBoard%20]
        selectedWord = selectedWord +letters.charAt(index)
      })     
      
      if ((atleastThree(indices)) && (noRepeated(indices)) && (consecutiveAdjacent(indices))){
        
        if (myDict.includes(selectedWord.toLowerCase())) {
          ws.score = ws.score + calculateScore(selectedWord)
          ws.send(JSON.stringify({
            type: "selectedword",
            selectedword: selectedWord,
          }))
          ws.send(JSON.stringify({
            type: "score",
            score: ws.score,
          }))
        } else {
          ws.send(JSON.stringify({
            type: "selectedword",
            selectedword: `Word ${selectedWord} is not a dictionary word.`
          }))
        }


      } else {
        ws.send(JSON.stringify({
          type: "selectedword",
          selectedword: `Word ${selectedWord} was not accepted by the server.`
        }))
      }
      
    }

  })
})

const setTopPlayer = () => {
  topPlayers = {}
  let allScores = []
  let allClients = []
  wss.clients.forEach((client) => allScores.push(client.score))
  wss.clients.forEach((client) => allClients.push(client.username))

  for(let i = 0; i < 3; i++){
    if ((allClients[0] !== undefined) && (allScores[0] !== undefined)) {
      let maximum = Math.max(...allScores)
      let index = allScores.indexOf(maximum)
      topPlayers[allClients[index]] = allScores[index]
      allClients.splice(index,1)
      allScores.splice(index,1)
    }
    
  }

  
  
}

const Broadcast = async () => {
  while(1){
    await delay(1)
    await setTopPlayer()
    wss.clients.forEach((client) => {
      client.send(JSON.stringify({
        type: "topplayers",
        topplayers: topPlayers
      }))
    })
    boardUpadteTime = boardUpadteTime - 1
    console.log("ETA: ", boardUpadteTime)
    if (boardUpadteTime < 0)
    {
      console.log("sending new board")
      currentBoard = (currentBoard + 1)%20
      wss.clients.forEach((client) => {
        client.score = 0
        client.send(JSON.stringify({
          type: "newletters",
          newletters: myBoards[currentBoard],
          secondsleft: 60
        }))
      })
      boardUpadteTime = boardUpadteTime = 60
    }

  }
}

Broadcast()



/*
    Part 1:
    I created a mousedown type message which I recieved from the server. This message contained the letter clicked on the by the client. I displayed this letter on the console.
*/
/*
    Part 2:
    I created a global string of 16 letters to match the string I hardcoded on my client. When I recieved the indices from the client, I used those indices from the client and generated the resultant string using my letters. Then I send the selected word back to the client.
*/
/*
  Part 3:
  In this part, first I created three validation functions:

    atleastThree(indices)
    noRepeated(indices)
    consecutiveAdjacent(indices)

  atleastThree would check if the length of indices array is greater than equal to three. Returns a bool accordingly
  noRepeated runs a nested for loop to check if there is a repeated index. If it finds on such case during the iteration of for loop, it returns false. If for loop terminates without any such instance, it returns true.
  consecutiveAdjacent check if the consecutive indices in the indeices array are adjacent to each other. I divided this function in two parts. First I created a dictionary which maintained the consecutive indices of every index in the indices array. Then for every index I calculated possible adjacent indices using div and mod operator and then I checked if the consecutive indices which I saved are indeed adjacent or not. I returned a bool accordingly.

  To load the dictionary I created a readDict function which would read dict and store the contents in myDict variable after splitting them over "\n"
  
  I compined all these 4 validation to return the correct message to client then.
*/
/*
  Part 4:
  In this part I created two objects and a fucntion

    scores
    clientScore
    calculateScore(word)

  scores is an object containing score corresponding to each letter

  clientScore is an object that contains the username of the client and their total score. This score is cumulative and keeps increasing on every correct word guess.

  calculatScore takes in the word and returns its score after summing up score of each individual letter of that word. This function utilizes the scores object

  If the client guesses the word correctly then I send the client a message specifying the new total score of client.
*/
/*
  Part 5:
  In part five i made variables to keep track of top player and timer and two functions

    boardUpdateTime
    topPlayers
    Broadcast()
    setTopPlayer()

    I will start the explaination with Broadcast() function. This function runs forever under the while 1 loop. at the start there is a delay of one second, after which I set the top player using my setTopPlayer() function and then broadcast the top players to all the connected clients. Then I have I decrement the timer which I initialized with 60. As soon as my timer variable goes below 0, I set the scores to 0 and send the new board to every client. 

    In my setTopPlayer function, I first take out names and scores of all the client. Then I make a dictionary of top 3 players and set it to topPlayers. In the beginning of the function I always reinitialize the topPlayers with empty dictionary.

  
*/
