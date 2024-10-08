import axios from 'axios'
import React, { useContext, useState } from 'react'
import { UserContext } from '../UserContext'

const RegisterAndLoginForm = () => {
    const [userName, setUserName] = useState('')
    const [password, setPassword] = useState('')
    const [isLoginOrRegister, setIsLoginOrRegister] = useState('register')
    const { setUsername: setLoggedInUsername, setId } = useContext(UserContext)

    const handleSubmit = async (e) => {
        e.preventDefault();
        const url = isLoginOrRegister === 'register' ? '/register' : '/login';
        try {
            const { data } = await axios.post(url, { username: userName, password });
            setLoggedInUsername(userName);
            setId(data.id);
        } catch (e) {
            console.log(e);
        }
    }

    return (
        <div className='bg-gradient-to-r from-blue-50 to-blue-100 h-screen flex items-center justify-center'>
            <form className='w-full max-w-md bg-white p-6 rounded-lg shadow-lg' onSubmit={handleSubmit}>
                <h2 className='text-2xl font-semibold text-gray-700 text-center mb-6'>
                    {isLoginOrRegister === 'register' ? 'Register' : 'Login'}
                </h2>
                <input
                    type="text"
                    placeholder='Username'
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    className='block w-full rounded-md p-2 mb-4 border border-gray-300 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                />
                <input
                    type="password"
                    placeholder='Password'
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className='block w-full rounded-md p-2 mb-4 border border-gray-300 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                />
                <button
                    className='bg-blue-500 hover:bg-blue-600 text-white block w-full rounded-md p-2 font-medium transition-all duration-200'>
                    {isLoginOrRegister === 'register' ? 'Register' : 'Login'}
                </button>
                <div className='text-center mt-4'>
                    {isLoginOrRegister === 'register' ? (
                        <div className='text-gray-600'>
                            Already a member?{' '}
                            <button
                                onClick={() => setIsLoginOrRegister('login')}
                                className='text-blue-500 hover:text-blue-600 font-medium focus:outline-none'>
                                Login Here
                            </button>
                        </div>
                    ) : (
                        <div className='text-gray-600'>
                            Don't have an account?{' '}
                            <button
                                onClick={() => setIsLoginOrRegister('register')}
                                className='text-blue-500 hover:text-blue-600 font-medium focus:outline-none'>
                                Register
                            </button>
                        </div>
                    )}
                </div>
            </form>
        </div>
    )
}

export default RegisterAndLoginForm;