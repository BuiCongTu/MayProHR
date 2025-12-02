package fpt.aptech.springbootapp.securities;

import java.io.*;
import java.util.*;

import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.*;
import jakarta.servlet.http.*;

public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtUtils jwtUtils;

    public JwtAuthenticationFilter(JwtUtils jwtUtils) {
        this.jwtUtils = jwtUtils;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {

        String path = request.getServletPath();
        if (isStaticResource(path)) {
            filterChain.doFilter(request, response);
            return;
        }

        //Skip API
        if (path.contains("/api/auth/login")
                || path.contains("/api/auth/register")
                || path.contains("/api/auth/forgot-password")
                || path.contains("/api/auth/reset-password")
                || path.contains("/api/payroll/")
                || path.contains("/api/face-scan/attendance")) {
            filterChain.doFilter(request, response);
            return;
        }

        // Extract JWT token
        String authHeader = request.getHeader("Authorization");
        String token = null;
        String email = null;

        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            token = authHeader.substring(7);
            try {
                email = jwtUtils.getEmailFromJwt(token);
            } catch (Exception e) {
                // Invalid token
            }
        }

        // Validate token
        if (email != null && SecurityContextHolder.getContext().getAuthentication() == null) {
            if (jwtUtils.validateToken(token, email)) {
                String role = (String) jwtUtils.extractAllClaims(token).get("role");
                if (role == null) {
                    role = "USER";
                }

                List<SimpleGrantedAuthority> authorities = List
                        .of(new SimpleGrantedAuthority("ROLE_" + role.toUpperCase()));

                UsernamePasswordAuthenticationToken authToken
                        = new UsernamePasswordAuthenticationToken(email, null, authorities);

                authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                SecurityContextHolder.getContext().setAuthentication(authToken);
            }
        }

        filterChain.doFilter(request, response);
    }

    //kiểm tra static
    private boolean isStaticResource(String path) {
        return path.startsWith("/static/")
                || path.equals("/")
                || path.equals("/index.html")
                || path.equals("/favicon.ico")
                || path.equals("/logo192.png")
                || path.equals("/logo512.png")
                || path.equals("/manifest.json")
                || path.equals("/robots.txt")
                || path.matches(".*\\.(css|js|json|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf)$")
                || path.equals("/error");
    }
}
//@Component
//public class JwtAuthenticationFilter extends OncePerRequestFilter {
//
//    @Autowired
//    private JwtUtils jwtUtils;
//
//    @Override
//    protected void doFilterInternal(
//            HttpServletRequest request,
//            HttpServletResponse response,
//            FilterChain filterChain) throws ServletException, IOException {
//        if (request.getServletPath().contains("/api/auth/login") ||
//                request.getServletPath().contains("/api/auth/register") ||
//                request.getServletPath().contains("/api/auth/forgot-password") ||
//                request.getServletPath().contains("/api/auth/reset-password") ||
//                request.getServletPath().contains("/api/payroll/")  ||
//                request.getServletPath().contains("/api/overtime-request/") ||
//                request.getServletPath().contains("/api/overtime-ticket/") ||
//                request.getServletPath().contains("/api/overtime/") ||
//                request.getServletPath().contains("/api/proposal/")) {
//            filterChain.doFilter(request, response);
//            return;
//        }
//
//
//        // Lấy token từ header Authorization
//        String authHeader = request.getHeader("Authorization");
//        String token = null;
//        String email = null;
//
//        // kiem tra token coi có hợp lệ không
//        if (authHeader != null && authHeader.startsWith("Bearer ")) {
//            token = authHeader.substring(7); // Cắt "Bearer "
//            try {
//                email = jwtUtils.getEmailFromJwt(token); // lấy email từ token
//            } catch (Exception e) {
//                System.out.println("Not valid: " + e.getMessage());
//            }
//        }
//
//        // nếu lấy được email và chưa có Authentication trong context
//        if (email != null && SecurityContextHolder.getContext().getAuthentication() == null) {
//
//            // kiểm tra tính hợp lệ của token
//            if (jwtUtils.validateToken(token, email)) {
//
//                // lấy role từ claim trong token (mặc định: USER)
//                String role = (String) jwtUtils.extractAllClaims(token).get("role");
//                if (role == null)
//                    role = "USER";
//
//                // tạo danh sách quyền hạn
//                List<SimpleGrantedAuthority> authorities = List
//                        .of(new SimpleGrantedAuthority("ROLE_" + role.toUpperCase()));
//
//                // tạo Authentication token cho Spring Security
//                UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(email, null,
//                        authorities);
//
//                authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
//
//                // gắn xác thực vào SecurityContext
//                SecurityContextHolder.getContext().setAuthentication(authToken);
//
//                System.out.println(" Authenticated: " + email + " | Role: " + role);
//            }
//        }
//
//        // tiếp tục filter chain
//        filterChain.doFilter(request, response);
//    }
//}

