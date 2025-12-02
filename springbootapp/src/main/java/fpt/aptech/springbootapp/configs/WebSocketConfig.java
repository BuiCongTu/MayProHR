package fpt.aptech.springbootapp.configs;

import fpt.aptech.springbootapp.securities.JwtUtils;
import io.jsonwebtoken.Claims;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

import java.util.List;

@Configuration
@EnableWebSocketMessageBroker
@Order(Ordered.HIGHEST_PRECEDENCE + 99)
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final JwtUtils jwtUtils;

    @Autowired
    public WebSocketConfig(JwtUtils jwtUtils) {
        this.jwtUtils = jwtUtils;
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        config.enableSimpleBroker("/topic", "/queue", "/user");
        config.setApplicationDestinationPrefixes("/app");
        config.setUserDestinationPrefix("/user");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*")
                .withSockJS();
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(new ChannelInterceptor() {
            @Override
            public Message<?> preSend(Message<?> message, MessageChannel channel) {

                StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

                if (accessor != null && StompCommand.CONNECT.equals(accessor.getCommand())) {

                    // 1. Get Token from Header
                    String authHeader = accessor.getFirstNativeHeader("Authorization");

                    if (authHeader != null && authHeader.startsWith("Bearer ")) {
                        String token = authHeader.substring(7);

                        try {
                            // 2. Validate and Extract Email
                            String email = jwtUtils.getEmailFromJwt(token);

                            if (email != null && jwtUtils.validateToken(token, email)) {

                                // 3. Extract Role
                                Claims claims = jwtUtils.extractAllClaims(token);
                                String role = (String) claims.get("role");
                                if (role == null) role = "USER";

                                List<SimpleGrantedAuthority> authorities = List
                                        .of(new SimpleGrantedAuthority("ROLE_" + role.toUpperCase()));

                                // 4. Create Auth Token
                                UsernamePasswordAuthenticationToken auth =
                                        new UsernamePasswordAuthenticationToken(email, null, authorities);

                                // 5. Set User for the WebSocket Session
                                accessor.setUser(auth);

                                System.out.println("WebSocket Authenticated: " + email);
                            }
                        } catch (Exception e) {
                            System.err.println("WebSocket Auth Failed: " + e.getMessage());
                        }
                    }
                }
                return message;
            }
        });
    }
}