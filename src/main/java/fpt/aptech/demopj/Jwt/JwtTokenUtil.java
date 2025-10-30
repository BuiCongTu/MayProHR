package fpt.aptech.demopj.Jwt;

import io.jsonwebtoken.*;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.util.Date;

@Component
public class JwtTokenUtil {

    private final String SECRET_KEY = "a-string-secret-at-least-256-bits-long-and-secure-for-production-usage-2025"; // ít nhất 32 ký tự
    private final long EXPIRATION_TIME = 1000 * 60 * 60; // 1 giờ

    // Tạo token
    public String generateToken(String email, String role) {
        return Jwts.builder()
                .setSubject(email)
                .claim("role", role)
                .setIssuedAt(new Date(System.currentTimeMillis()))
                .setExpiration(new Date(System.currentTimeMillis() + EXPIRATION_TIME))
                .signWith(getSigningKey(), SignatureAlgorithm.HS256)
                .compact();
    }

    // Lấy email từ token
    public String getEmailFromJwt(String token) {
        return getClaims(token).getSubject();
    }

    // Lấy role từ token
    public String getRoleFromJwt(String token) {
        return (String) getClaims(token).get("role");
    }

    // Kiểm tra token hợp lệ
    public boolean validateJwtToken(String token) {
        try {
            getClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            System.out.println("Invalid JWT: " + e.getMessage());
        }
        return false;
    }

    // Lấy claims
    private Claims getClaims(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(getSigningKey())
                .build()
                .parseClaimsJws(token)
                .getBody();
    }

    // Sinh key
    private Key getSigningKey() {
        return Keys.hmacShaKeyFor(SECRET_KEY.getBytes(StandardCharsets.UTF_8));
    }

}
