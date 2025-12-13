import React, {createContext, useContext, useEffect, useState, useRef, useCallback, useMemo} from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { getToken } from '../services/authService';
import {useNavigate} from "react-router-dom";

const WebSocketContext = createContext(null);

export const WebSocketProvider = ({ children }) => {
    const [connected, setConnected] = useState(false);
    const clientRef = useRef(null);
    const navigate = useNavigate();

    // Store token in state to force re-evaluation
    const [token, setToken] = useState(getToken());

    useEffect(() => {
        const currentToken = getToken();
        if (currentToken !== token) setToken(currentToken);

        if (!currentToken) return;

        console.log("Attempting WebSocket Connection with User Token...");

        const socketFactory = () => new SockJS('http://localhost:9999/socket');

        const client = new Client({
            webSocketFactory: socketFactory,
            reconnectDelay: 5000,
            connectHeaders: {
                Authorization: `Bearer ${currentToken}`
            },
            onConnect: () => {
                console.log('WebSocket Connected');
                setConnected(true);
            },
            onStompError: (frame) => {
                const message = frame.headers['message'];
                console.error('Broker reported error: ' + frame.headers['message']);
                if (message && message.includes("Authentication failed")) {
                    console.log("Authentication failed. Forcing refresh/re-login.");
                    navigate("/logout", { replace: true });
                    window.location.reload();
                }
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

    const subscribe = useCallback((destination, callback) => {
        if (!clientRef.current || !connected) return null;
        return clientRef.current.subscribe(destination, (message) => {
            try {
                const body = message.body ? JSON.parse(message.body) : message.body;
                callback(body);
            } catch (e) {
                callback(message.body);
            }
        });
    }, [connected]);

    const contextValue = useMemo(() => ({
        client: clientRef.current,
        connected,
        subscribe
    }), [connected, subscribe]);

    return (
        <WebSocketContext.Provider value={contextValue}>
            {children}
        </WebSocketContext.Provider>
    );
};

export const useWebSocket = () => useContext(WebSocketContext);