package fpt.aptech.springbootapp.configs;

import java.util.Arrays;
import java.util.Collections; // Added this import

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order; // Added this import
import org.springframework.http.HttpMethod; // Added this import
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;

import fpt.aptech.springbootapp.securities.JwtAuthenticationFilter;
import fpt.aptech.springbootapp.securities.JwtUtils; // Added this import
import fpt.aptech.springbootapp.services.implementations.CustomUserDetailsService;

@Configuration
@EnableWebSecurity
// @EnableGlobalMethodSecurity(prePostEnabled = true)
@EnableMethodSecurity(prePostEnabled = true)

public class SecurityConfig {

    private final CustomUserDetailsService userDetailsService;

    @Autowired
    private JwtUtils jwtUtils;

    public SecurityConfig(CustomUserDetailsService userDetailsService) {
        this.userDetailsService = userDetailsService;
    }

    public JwtAuthenticationFilter jwtAuthenticationFilter() {
        return new JwtAuthenticationFilter(jwtUtils);
    }

    @Bean
    public static PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public DaoAuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider();
        authProvider.setUserDetailsService(userDetailsService);
        authProvider.setPasswordEncoder(passwordEncoder());
        return authProvider;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration configuration) throws Exception {
        return configuration.getAuthenticationManager();
    }

    @Bean
    @Order(Ordered.HIGHEST_PRECEDENCE)
    public CorsFilter corsFilter() {
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        CorsConfiguration config = new CorsConfiguration();

        config.setAllowCredentials(true);
        config.setAllowedOriginPatterns(Collections.singletonList("*"));
        // Allow all headers/methods
        config.setAllowedHeaders(Arrays.asList("Origin", "Content-Type", "Accept", "Authorization", "X-Requested-With", "Access-Control-Request-Method", "Access-Control-Request-Headers"));
        config.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));

        source.registerCorsConfiguration("/**", config);
        return new CorsFilter(source);
    }

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        System.out.println("Loading Security Configuration...");

        http
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .formLogin(AbstractHttpConfigurer::disable)
                .httpBasic(AbstractHttpConfigurer::disable)
                .authorizeHttpRequests(auth -> auth
                // Allow CORS preflight 
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                // Public Resources
                .requestMatchers(
                        "/", "/error", "/favicon.ico", "/logo192.png", "/logo512.png",
                        "/manifest.json", "/robots.txt", "/attendance/**"
                ).permitAll()
                // Public APIs
                .requestMatchers(
                        "/api/auth/**",

                        "/socket/**",
                        "/api/overtime/**",
                        "/api/proposal/**",

                        "/api/department/**",
                        "/api/face/config",
                        "/api/cccd/scan",
                        "/api/cccd/scan-application",
                        "/api/face-scan/attendance",
                        "/actuator/health",
                        "/api/lines/**",
                        "/api/line/**",
                        "/api/user/**",
                        "/api/form-data/**",
                        "/api/automation/demo/**"
                ).permitAll()
                // Protected APIs
                .requestMatchers(
                        "/api/payroll/**",
                        "/api/face-scan/**",
                        "/api/face-training/**",
                        "/api/attendance/**",
                        "/api/leave/**",
                        "/api/app/overtime/**",
                        "/api/overtime-request/**",
                        "/api/overtime-ticket/**",
                        "/api/notifications/**"
                ).authenticated()
                .anyRequest().authenticated()
                )
                .authenticationProvider(authenticationProvider())
                .userDetailsService(userDetailsService)
                // Add the manual filter instance
                .addFilterBefore(jwtAuthenticationFilter(), UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }
}
