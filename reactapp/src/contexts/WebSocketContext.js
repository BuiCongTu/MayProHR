import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { getToken } from '../services/authService';

const WebSocketContext = createContext(null);

export const WebSocketProvider = ({ children }) => {
    const [connected, setConnected] = useState(false);
    const clientRef = useRef(null);

    // Store token in state to force re-evaluation
    const [token, setToken] = useState(getToken());

    useEffect(() => {
        const currentToken = getToken();
        if (currentToken !== token) setToken(currentToken);

        if (!currentToken) return;

        console.log("Attempting WebSocket Connection with User Token...");

        const socketFactory = () => new SockJS(window.location.origin + '/socket');

        const client = new Client({
            webSocketFactory: socketFactory,
            reconnectDelay: 5000,
            // Ensure headers are sent correctly
            connectHeaders: {
                Authorization: `Bearer ${currentToken}`
            },
            onConnect: () => {
                console.log('WebSocket Connected');
                setConnected(true);
            },
            onStompError: (frame) => {
                console.error('Broker reported error: ' + frame.headers['message']);
            },
            onWebSocketClose: () => {
                console.log('WebSocket connection closed');
                setConnected(false);
            }
        });

        client.activate();
        clientRef.current = client;

        return () => {
            if (clientRef.current) {
                clientRef.current.deactivate();
            }
        };
    }, [token]); // Re-run if token changes

    const subscribe = (destination, callback) => {
        if (!clientRef.current || !connected) return null;
        return clientRef.current.subscribe(destination, (message) => {
            try {
                const body = message.body ? JSON.parse(message.body) : message.body;
                callback(body);
            } catch (e) {
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