import React, { useContext, useState } from 'react';
import { AppContext } from '../context/AppContext';

export const Panel5 = () => {
    const context = useContext(AppContext);
    if (!context) return null;

    const { user, needsAuth, login, logout, accessToken } = context;

    const [message, setMessage] = useState('');

    const testCalendar = async () => {
        if (!accessToken) return;
        setMessage('Fetching upcoming events...');
        try {
            const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=5&orderBy=startTime&singleEvents=true', {
                headers: { Authorization: `Bearer ${accessToken}` }
            });
            const data = await res.json();
            if (data.items) {
                setMessage(`Found ${data.items.length} events. First: ${data.items[0]?.summary || 'None'}`);
            } else {
                setMessage('Failed to read calendar.');
            }
        } catch(e: any) {
            setMessage('Error: ' + e.message);
        }
    };

    const createDocument = async () => {
        if (!accessToken) return;
        const confirm = window.confirm("Are you sure you want to create a new Google Doc for the transportation manifest?");
        if (!confirm) return;
        
        setMessage('Creating document...');
        try {
            const res = await fetch('https://docs.googleapis.com/v1/documents', {
                method: 'POST',
                headers: { 
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    title: 'Transport Manifest - ' + new Date().toLocaleDateString()
                })
            });
            const data = await res.json();
            if (data.documentId) {
                setMessage(`Created! Doc ID: ${data.documentId}`);
            }
        } catch(e: any) {
            setMessage('Error: ' + e.message);
        }
    };

    const testTasks = async () => {
        if (!accessToken) return;
        setMessage('Fetching task lists...');
        try {
            const res = await fetch('https://tasks.googleapis.com/tasks/v1/users/@me/lists', {
                headers: { Authorization: `Bearer ${accessToken}` }
            });
            const data = await res.json();
            if (data.items) {
                setMessage(`Found ${data.items.length} task lists. First: ${data.items[0]?.title || 'None'}`);
            } else {
                setMessage('Failed to read Tasks.');
            }
        } catch(e: any) {
            setMessage('Error: ' + e.message);
        }
    };

    return (
        <div className="pb-20 max-w-7xl mx-auto min-h-screen bg-bglight">
            <div className="bg-navy text-white p-8 text-center shadow-md sm:rounded-b-2xl">
                <h1 className="text-3xl font-black uppercase tracking-tighter mb-2">Workspace</h1>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Connect Google Apps</p>
            </div>

            <div className="p-4 sm:p-6 space-y-6 max-w-2xl mx-auto">
                {needsAuth ? (
                    <div className="bg-white rounded-2xl p-8 border border-gray-200 text-center shadow-sm">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <span className="text-3xl">🔑</span>
                        </div>
                        <h2 className="text-xl font-bold text-navy mb-2">Google Authentication Required</h2>
                        <p className="text-sm text-gray-500 mb-6">Sign in to sync schedules to Docs, Calendar, and Tasks.</p>
                        
                        <button onClick={login} className="gsi-material-button mx-auto w-full max-w-xs flex items-center justify-center bg-white border border-gray-300 text-gray-700 font-medium py-3 px-4 rounded-full hover:bg-gray-50 transition-colors tap-target">
                            <div className="mr-3">
                                <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-5 h-5">
                                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                                    <path fill="none" d="M0 0h48v48H0z"></path>
                                </svg>
                            </div>
                            Sign in with Google
                        </button>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                {user?.photoURL ? (
                                    <img src={user.photoURL} alt="Profile" className="w-12 h-12 rounded-full border-2 border-orange" />
                                ) : (
                                    <div className="w-12 h-12 rounded-full bg-navy flex items-center justify-center text-white font-bold">{user?.email?.charAt(0).toUpperCase()}</div>
                                )}
                                <div>
                                    <p className="font-bold text-gray-800">{user?.displayName || 'User'}</p>
                                    <p className="text-xs text-gray-500">{user?.email}</p>
                                </div>
                            </div>
                            <button onClick={logout} className="text-xs font-bold text-red-500 uppercase tracking-widest hover:text-red-700 tap-target px-4 shadow-sm border border-red-100 rounded-lg py-2">Sign Out</button>
                        </div>

                        {message && (
                            <div className="bg-navy/5 border-l-4 border-navy p-4 rounded-r-lg">
                                <p className="text-sm font-medium text-navy">{message}</p>
                            </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <button onClick={testCalendar} className="bg-white border border-gray-200 hover:border-orange hover:shadow-md transition-all rounded-xl p-5 text-left tap-target group">
                                <span className="text-3xl mb-3 block group-hover:scale-110 transition-transform">📅</span>
                                <h3 className="font-bold text-navy mb-1">Calendar</h3>
                                <p className="text-xs text-gray-500">Read upcoming transport schedules from your calendar.</p>
                            </button>

                            <button onClick={createDocument} className="bg-white border border-gray-200 hover:border-orange hover:shadow-md transition-all rounded-xl p-5 text-left tap-target group">
                                <span className="text-3xl mb-3 block group-hover:scale-110 transition-transform">📝</span>
                                <h3 className="font-bold text-navy mb-1">Google Docs</h3>
                                <p className="text-xs text-gray-500">Generate a passenger manifest in a new document.</p>
                            </button>

                            <button onClick={testTasks} className="bg-white border border-gray-200 hover:border-orange hover:shadow-md transition-all rounded-xl p-5 text-left tap-target group">
                                <span className="text-3xl mb-3 block group-hover:scale-110 transition-transform">✅</span>
                                <h3 className="font-bold text-navy mb-1">Google Tasks</h3>
                                <p className="text-xs text-gray-500">View tasks and checklists for operators.</p>
                            </button>
                            
                            <button onClick={() => setMessage("Forms API integration ready! You can build custom vehicle inspection forms.")} className="bg-white border border-gray-200 hover:border-orange hover:shadow-md transition-all rounded-xl p-5 text-left tap-target group">
                                <span className="text-3xl mb-3 block group-hover:scale-110 transition-transform">📋</span>
                                <h3 className="font-bold text-navy mb-1">Google Forms</h3>
                                <p className="text-xs text-gray-500">Manage inspection forms responses.</p>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
