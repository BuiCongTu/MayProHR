package fpt.aptech.springbootapp.configs;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        // /topic: for public broadcasts (e.g., /topic/requests)
        // /user: for private messages (e.g., /user/queue/notifications)
        config.enableSimpleBroker("/topic", "/queue", "/user");

        // Prefix for messages sent FROM client TO server
        config.setApplicationDestinationPrefixes("/app");

        // Prefix for private messages to specific users
        config.setUserDestinationPrefix("/user");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*") // Allow React localhost:3000
                .withSockJS();
    }
}