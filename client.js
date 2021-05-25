const ws = new WebSocket(`ws://localhost:8080`)

const delay = (seconds) => 
  new Promise((resolve) => setTimeout(resolve, seconds * 1000))

const Wordament = () => {
    const [username, setUsername] = React.useState('')
    const [displayGrid, setDisplayGrid] = React.useState(false)
    const [letters, setLetters] = React.useState('ABEDAHGZIJKLMNOP')
    const [color, setColor] = React.useState([['white', 'white', 'white', 'white'],
                                              ['white', 'white', 'white', 'white'],
                                              ['white', 'white', 'white', 'white'],
                                              ['white', 'white', 'white', 'white']])
    const [toggleMouseDown, setToggleMouseDown] = React.useState(false)
    const [wordIndices, setWordIndices] = React.useState([])
    const [wordSelected, setWordSelected] = React.useState('')
    const [myScore, setMyScore] = React.useState(0)
    const [secondsLeft, setSecondsLeft] = React.useState(0)
    const [topPlayers, setTopPlayers] = React.useState({})

    const Timer = async () => {
        while(1){
            await delay(1)
            setSecondsLeft(prevState => prevState - 1)
        }
    }

    

    ws.onmessage = (event) => {
        console.log(`received: ${event.data}`)
        
        const serverMessage = JSON.parse(event.data)

       if (serverMessage.type === 'selectedword') {
           setWordSelected(serverMessage.selectedword)
       }
       
       if (serverMessage.type === 'topplayers') {
            setTopPlayers(serverMessage.topplayers)
       }

       if (serverMessage.type === 'newletters') {
           setLetters(serverMessage.newletters)
           setMyScore(0)
           setSecondsLeft(serverMessage.secondsleft)
       }
       if (serverMessage.type === 'firstnewletters') {
        setLetters(serverMessage.newletters)
        setMyScore(0)
        setSecondsLeft(serverMessage.secondsleft)
        Timer()
    }

       if (serverMessage.type === 'score'){
           setMyScore(serverMessage.score)
       }
    }
    
    const onMouseDown = (i) => {
        
        setToggleMouseDown(true)
        setWordIndices([...wordIndices, i])

        const row = Math.floor(i/4)
        const col = i%4

        let newcolor = [[],
                        [],
                        [],
                        []]

       
        color.forEach((x, i) => {
            if (i === row) {
                x.forEach((y, j) => {
                    if (j === col) {
                        newcolor[i].push('green')
                    } else {
                        newcolor[i].push(y)
                    }
                })
            } else {
                x.forEach((y, j) => newcolor[i].push(y))
            }
            
        })
        
        setColor(newcolor)      
        
    }

    const onMouseUp = (i) => {
        setToggleMouseDown(false)

        setColor([['white', 'white', 'white', 'white'],
                  ['white', 'white', 'white', 'white'],
                  ['white', 'white', 'white', 'white'],
                  ['white', 'white', 'white', 'white']]
        )

        ws.send(
            JSON.stringify({
                type: 'wordindices',
                username: username,
                wordindices: wordIndices
            })
        )

        setWordIndices([])

    }

    const onMouseEnter = (i) => {
        let newcolor = [[],
                        [],
                        [],
                        []]
 
        if(toggleMouseDown) {
                     
            if (i != wordIndices[(wordIndices.length)-2]) {
                setWordIndices([...wordIndices, i])

                const row = Math.floor(i/4)
                const col = i%4

                
                color.forEach((x, i) => {
                    if (i === row) {
                        x.forEach((y, j) => {
                            if (j === col) {
                                newcolor[i].push('green')
                            } else {
                                newcolor[i].push(y)
                            }
                        })
                    } else {
                        x.forEach((y, j) => newcolor[i].push(y))
                    }
                    
                })
                
                setColor(newcolor)

                
            } else {

                const makeWhite = wordIndices[(wordIndices.length)-1]

                const row = Math.floor(makeWhite/4)
                const col = makeWhite%4



                setWordIndices(wordIndices.filter((index) => index != wordIndices[(wordIndices.length)-1]))
                color.forEach((x, i) => {
                    if (i === row) {
                        x.forEach((y, j) => {
                            if (j === col) {
                                newcolor[i].push('white')
                            } else {
                                newcolor[i].push(y)
                            }
                        })
                    } else {
                        x.forEach((y, j) => newcolor[i].push(y))
                    }
                    
                })
                
                setColor(newcolor)
            }

        } else {
            const row = Math.floor(i/4)
            const col = i%4



            setWordIndices(wordIndices.filter((index) => index != wordIndices[(wordIndices.length)-1]))
            color.forEach((x, i) => {
                if (i === row) {
                    x.forEach((y, j) => {
                        if (j === col) {
                            newcolor[i].push('lightblue')
                        } else {
                            newcolor[i].push('white')
                        }
                    })
                } else {
                    x.forEach((y, j) => newcolor[i].push('white'))
                }
                
            })
            
            setColor(newcolor)
        }

    }

    const onMouseLeave = (i) => {
        
    }

    const onSubmit = (event) => {
        event.preventDefault()
        if (username !== "") {
            setDisplayGrid(true)
            ws.send(
                JSON.stringify({
                    type: 'username',
                    username: username
                })
            )
        }

        
    }

    const onChange = (event) => {
        setUsername(event.target.value)
    }

    const WordGrid = () => {
        
        let rows = []

        let count = 0
        for (let i = 0; i <16; i = i + 4) {
            let buttons = []
            let start = i

            for (let j = 0; j < 4; j++) {
                buttons.push(
                    <button key = {i+j} onMouseDown={() => onMouseDown(start+j)} onMouseUp={() => onMouseUp(start+j)} onMouseEnter={() => onMouseEnter(start+j)} onMouseLeave={() => onMouseLeave(start+j)} style={{backgroundColor: color[count][j]}}>
                        {letters.slice(start+j, start+j+1)}
                    </button>
                )
            }
            count++
            
            rows.push(
                <div key={i}>
                    {buttons}
                </div>
            )
        }

        return (
            <div>
                {rows}
            </div>
        )


    }

    if ( displayGrid === false) {
        return (
            <div>
                <form onSubmit={onSubmit} >
                    <input type='text' value={username} onChange={onChange}></input>
                    <input title='Connect' type='submit'></input>
                </form>
            </div>
        )
    } else {
        return (
            <div>
                <WordGrid />
                <p>
                    Username: {username}
                </p>
                <p>
                    Selected Word: {wordSelected}
                </p>
                <p>
                    Score: {myScore}
                </p>
                <p>
                    Timer: {secondsLeft}
                </p>
                <p>
                    Top Players; {JSON.stringify(topPlayers)}
                </p>
            </div>
        )
    }
    

    
}

ReactDOM.render(<Wordament />, document.querySelector(`#root`))



/*
    Part 1:
    In part one I made a 3 React hooks for the initial implementation:

        const [username, setUsername] = React.useState('')
        const [displayGrid, setDisplayGrid] = React.useState(false)
        const [letters, SetLetters] = React.useState('ABCDEFGHIJKLMNOP')

    username contained the username of the user. I would change set the username by invoking onChange of the text input and using the event target value. OnSubmit I would send the value to the server.

    For part 1 I hardcoded 16 letters to generate the buttons. The buttons were rendered using nested for loops where first 4 letters from letters hook were rendered in first row and next four in second row and so on. I also set Unique keys for each element for React rendering. onMouseDown the color would was set to green (state given initially by Sir in skeleton code) and onMouseUp it was set to white. onMouseDown the letter value was sent to the server.

    I also made a display grid state. This state was toggled onSubmit event to specify if the user has entered the username. Using this boolean value I decided what to display to user. 
*/

/*
    Part 2:
    In part two I made a 4 React hooks for the initial implementation:

        const [color, setColor] = React.useState([['white', 'white', 'white', 'white'],
                                                ['white', 'white', 'white', 'white'],
                                                ['white', 'white', 'white', 'white'],
                                                ['white', 'white', 'white', 'white']])
        const [toggleMouseDown, setToggleMouseDown] = React.useState(false)
        const [wordIndices, setWordIndices] = React.useState([])
        const [wordSelected, setWordSelected] = React.useState('')

        First I tried coloring the grid the right way. 

        Because I had to maintain colors of every button, I change the color state into 2D array contatined the colors for every button

        onMouseDown: Here  I would color the button green and set toggleMouseDown to true,

        onMouseEnter: Here I checked if the toggleMouseDown was true or not. 
        If it wasn't then I would just color the button in which the cursor entered lightblue and keep all the other buttons white.
        If it was then I would maintain the previous colors and color the current button green to make green color chain.

        onMouseUp: I would reset the color hook to all whites

        After this I started dealing with indices.

        onMouseDown: I would append the index of the button in the wordIndices hook.

        onMouseEnter: I would check if the index of button is second last in my wordIndices hook. 
        If it is then I would remove the last index from my wordIndices and color that button white.
        If it is not the I would add the index into my wordIndices and color that button green.

        onMouseUp: I would send the indices to server and reset both color hook and wordIndices hook.

        After that I added a paragraph tag beneath my wordgrid and displayed the message from server in it using the wordSelected hook. This hook was modified when the server told client which word was selected by the client.
*/
/*
    Part 3:
    Nothing was done on client side in part 3
*/
/*
    Part 4:
    In part four I made a hook

        const [myScore, setMyScore] = React.useState(0)

    This hook contained the score of the client. In message handler, whenever sclient recieved the message containing the new score, this hook was updated. I also added paragraph tag to display the score
*/
/*
    Part 5:
    In part five I made 2 more hooks and a timer function
        
        const [secondsLeft, setSecondsLeft] = React.useState(0)
        const [topPlayers, setTopPlayers] = React.useState({})
        Timer()

    The secondsLeft state maintains the number of seconds until the next board will be sent by the server. 
    The topPlaters state maintains the dictionary of top players sent by server after every second. If the contents of dictionary change, the change is rendered on the screen.
    Timer function is a simple forever running function. It has a while 1 loop. There is a delay of 1 second in the loop and after the 1 second elapses, the secondsLeft state is decremented. 
*/