import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { getCurrentUser } from '../services/authService';

const WebSocketContext = createContext(null);

export const WebSocketProvider = ({ children }) => {
    const [connected, setConnected] = useState(false);
    const clientRef = useRef(null);
    const user = getCurrentUser();

    useEffect(() => {
        if (!user || !user.token) return;

        // 1. Initialize Client
        const socketFactory = () => new SockJS('http://localhost:9999/ws');

        const client = new Client({
            webSocketFactory: socketFactory,
            reconnectDelay: 5000, // Try to reconnect every 5s if lost
            debug: (str) => {
                console.log(str);
            },
            connectHeaders: {
                Authorization: `Bearer ${user.token}`
            }
        });

        // 2. Lifecycle Callbacks
        client.onConnect = (frame) => {
            console.log('✅ WebSocket Connected: ' + frame.headers['user-name']);
            setConnected(true);
        };

        client.onStompError = (frame) => {
            console.error('Broker reported error: ' + frame.headers['message']);
            console.error('Additional details: ' + frame.body);
        };

        client.onWebSocketClose = () => {
            console.log('WebSocket connection closed');
            setConnected(false);
        };

        // 3. Activate
        client.activate();
        clientRef.current = client;

        // 4. Cleanup on Unmount
        return () => {
            if (clientRef.current) {
                clientRef.current.deactivate();
            }
        };
    }, [user?.token]); // Re-connect if token changes

    // --- Helper to Subscribe safely ---
    const subscribe = (destination, callback) => {
        if (!clientRef.current || !connected) return null;

        return clientRef.current.subscribe(destination, (message) => {
            try {
                const body = JSON.parse(message.body);
                callback(body);
            } catch (e) {
                console.error("Failed to parse WS message", e);
                callback(message.body);
            }
        });
    };

    return (
        <WebSocketContext.Provider value={{ client: clientRef.current, connected, subscribe }}>
            {children}
        </WebSocketContext.Provider>
    );
};

export const useWebSocket = () => useContext(WebSocketContext);