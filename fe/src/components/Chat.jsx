import React, { useContext, useEffect, useRef, useState } from 'react'
import Logo from './Logo'
import { UserContext } from '../UserContext'
import { uniqBy } from 'lodash'
import axios from 'axios'
import Contact from './Contact'

const Chat = () => {
    const [ws, setWs] = useState(null)
    const [onlinePeople, setOnlinePeople] = useState({})
    const [offlinePeople, setOfflinePeople] = useState({})
    const [selectedUserId, setSelectedUserId] = useState(null);
    const [messages, setMessages] = useState([])
    const { username, id, setId, setUsername } = useContext(UserContext)
    const [newMessageText, setNewMessageText] = useState('')
    const divUnderMessages = useRef();

    useEffect(() => {
        connectToWs();
    }, [])

    function connectToWs() {
        const ws = new WebSocket('ws://localhost:4000');
        setWs(ws);

        ws.addEventListener('message', handleMessage)
        ws.addEventListener('close', () => {
            setTimeout(() => {
                connectToWs()
            }, 1000)
        })
    }

    function showOnLinePeople(peopleArray) {
        const people = {};
        peopleArray.forEach(({ userId, username }) => {
            people[userId] = username;
        })
        setOnlinePeople(people)
    }

    function handleMessage(e) {
        const messageData = JSON.parse(e.data);
        if ('online' in messageData)
            showOnLinePeople(messageData.online)
        else if ('text' in messageData)
            if (messageData.sender === selectedUserId) {
                setMessages(prev => ([...prev, { ...messageData }]))
            }
    }

    const sendFile = (e) => {
        const reader = new FileReader();
        reader.readAsDataURL(e.target.files[0]);
        reader.onload = () => {
            sendMessage(null, {
                name: e.target.files[0].name,
                data: reader.result,
            })
        }
    }

    const logout = () => {
        axios.post('/logout').then(() => {
            setWs(null)
            setId(null)
            setUsername(null)
        })
    }

    const sendMessage = (e, file = null) => {
        if (e) e.preventDefault();
        ws.send(JSON.stringify({
            recepient: selectedUserId,
            text: newMessageText,
            file,
        }))
        if (file) {
            axios.get('/messages/' + selectedUserId)
                .then(res => {
                    setNewMessageText('')
                    const { data } = res;
                    setMessages(data);
                })
        } else {
            setNewMessageText('')
            setMessages(prev => ([...prev, {
                text: newMessageText,
                sender: id,
                recepient: selectedUserId,
                _id: Date.now()
            }]))
        }
    }

    useEffect(() => {
        axios.get('/people').then(res => {
            const offLinePeopleArr = res.data
                .filter(p => p._id !== id)
                .filter(p => !Object.keys(onlinePeople).includes(p._id))

            const offlinePeople = {};
            offLinePeopleArr.forEach(p => {
                offlinePeople[p._id] = p;
            })
            setOfflinePeople(offlinePeople)
        })
    }, [onlinePeople])

    useEffect(() => {
        const div = divUnderMessages.current;
        if (div)
            div.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }, [messages])

    useEffect(() => {
        if (selectedUserId) {
            axios.get('/messages/' + selectedUserId)
                .then(res => {
                    const { data } = res;
                    setMessages(data);
                })
        }
    }, [selectedUserId])

    const onlinePeopleExcludingOurUser = { ...onlinePeople }
    delete onlinePeopleExcludingOurUser[id];

    const messagesWithoutDupes = uniqBy(messages, '_id');

    return (
        <div className='flex h-screen font-sans bg-gradient-to-r from-blue-50 to-blue-100'>
            {/* Sidebar */}
            <div className="bg-white w-1/3 flex flex-col border-r shadow-lg">
                <div className='flex-grow'>
                    <Logo />
                    <div className="p-3 text-lg font-medium text-gray-700">
                        Online Users
                    </div>
                    {
                        onlinePeopleExcludingOurUser && Object.keys(onlinePeopleExcludingOurUser).map(userId => (
                            <Contact
                                key={userId}
                                id={userId}
                                username={onlinePeopleExcludingOurUser[userId]}
                                onClick={() => setSelectedUserId(userId)}
                                selected={userId === selectedUserId}
                                onLine={true}
                            />
                        ))
                    }
                    <div className="p-3 text-lg font-medium text-gray-700 mt-4">
                        Offline Users
                    </div>
                    {
                        offlinePeople && Object.keys(offlinePeople).map(userId => (
                            <Contact
                                key={userId}
                                id={userId}
                                username={offlinePeople[userId].username}
                                onClick={() => setSelectedUserId(userId)}
                                selected={userId === selectedUserId}
                                onLine={false}
                            />
                        ))
                    }
                </div>
                {/* Logout */}
                <div className='p-2 text-center flex items-center gap-3 justify-center border-t'>
                    <span className='text-sm text-gray-600 flex items-center'>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                            <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM3.751 20.105a8.25 8.25 0 0 1 16.498 0 .75.75 0 0 1-.437.695A18.683 18.683 0 0 1 12 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 0 1-.437-.695Z" clipRule="evenodd" />
                        </svg>
                        {username}
                    </span>
                    <button onClick={logout}
                        className='text-sm text-gray-500 bg-red-100 py-1 px-2 border rounded-sm'>Logout</button>
                </div>
            </div>

            {/* Messages Section */}
            <div className="flex flex-col bg-white w-2/3 p-4 shadow-lg">
                <div className='flex-grow overflow-y-auto'>
                    {
                        !selectedUserId && (
                            <div className='flex h-full items-center justify-center'>
                                <div className='text-gray-400'>
                                    &larr; Select a person to chat
                                </div>
                            </div>
                        )
                    }
                    {
                        !!selectedUserId && (
                            <div className='relative h-full'>
                                <div className='overflow-y-scroll absolute top-0 left-0 right-0 bottom-2'>
                                    {messagesWithoutDupes.map(msg => (
                                        <div key={msg._id} className={(msg.sender === id ? "text-right" : "text-left")}>
                                            <div className={'p-3 my-2 inline-block rounded-lg text-sm shadow-md ' + (msg.sender === id ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-600")}>
                                                {msg.text}
                                                {msg.file && (
                                                    <div>
                                                        <a target='_blank' rel="noreferrer" className='flex items-center gap-1 text-blue-600' href={axios.defaults.baseURL + 'uploads/' + msg.file}>
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                                                <path fillRule="evenodd" d="M18.97 3.659a2.25 2.25 0 0 0-3.182 0l-10.94 10.94a3.75 3.75 0 1 0 5.304 5.303l7.693-7.693a.75.75 0 0 1 1.06 1.06l-7.693 7.693a5.25 5.25 0 1 1-7.424-7.424l10.939-10.94a3.75 3.75 0 1 1 5.303 5.304L9.097 18.835l-.008.008-.007.007-.002.002-.003.002A2.25 2.25 0 0 1 5.52 15.48L16.46 4.54a.75.75 0 0 1 1.06 1.06L6.58 16.54a.75.75 0 1 0 1.06 1.06l9.88-9.88a2.25 2.25 0 0 0 0-3.182z" clipRule="evenodd" />
                                                            </svg>
                                                            {msg.file.name}
                                                        </a>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    <div ref={divUnderMessages}></div>
                                </div>
                            </div>
                        )
                    }
                </div>

                <form onSubmit={sendMessage} className='flex gap-2'>
                    <input
                        type='text'
                        value={newMessageText}
                        onChange={e => setNewMessageText(e.target.value)}
                        placeholder='Type your message here...'
                        className='border border-gray-300 rounded-lg p-2 w-full'
                    />
                    <input type="file" onChange={sendFile} />
                    <button className='bg-blue-600 text-white rounded-lg px-4'>Send</button>
                </form>
            </div>
        </div>
    )
}

export default Chat
