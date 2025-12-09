package fpt.aptech.springbootapp.securities;

import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.Date;

import javax.crypto.SecretKey;

import org.springframework.stereotype.Component;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;

@Component
public class JwtUtils {

    private static final String secret = "AIzaSyB8dmLwCiGmIH82ZCCBPWP9IECoBapa27A";
    // expiration time 1 hour
    private static final long jwtExpirationMs = 1000 * 60 * 60 * 24;

    public String generateToken(String email, String role) {
        return Jwts.builder().setSubject(email)
                .claim("role", role)
                .setIssuedAt(new Date(System.currentTimeMillis()))
                .setExpiration(new Date(System.currentTimeMillis() + jwtExpirationMs))
                .signWith(secretTokey(secret), SignatureAlgorithm.HS256).compact();
    }

    //lấy email từ token
    public String getEmailFromJwt(String token) {
        return extractUsername(token);
    }

    private SecretKey secretTokey(String secret) {
        var bytes = secret.getBytes(StandardCharsets.UTF_8);
        try {
            var key = Keys.hmacShaKeyFor(bytes);
            return key;
        } catch (Exception e) {
            return Keys.hmacShaKeyFor(Arrays.copyOf(bytes, 64));
        }
    }

    public String extractUsername(String token) {
        return Jwts.parser().setSigningKey(secretTokey(secret)).build()
                .parseClaimsJws(token).getBody().getSubject();
    }

    public boolean isTokenExpired(String token) {
        return extractExpiration(token).before(new Date());
    }

    //vong doi
    public Date extractExpiration(String token) {
        return Jwts.parser().setSigningKey(secretTokey(secret)).build()
                .parseClaimsJws(token).getBody().getExpiration();
    }

    public boolean validateToken(String token, String username) {
        return (username.equals(extractUsername(token)) && !isTokenExpired(token));
    }

    // Lấy role từ token
    public String getRoleFromJwt(String token) {
        Claims claims = Jwts.parser()
                .setSigningKey(secretTokey(secret))
                .build()
                .parseClaimsJws(token)
                .getBody();
        return claims.get("role", String.class);
    }

    // Lấy Claims (toàn bộ thông tin trong token)
    public Claims extractAllClaims(String token) {
        return Jwts.parser()
                .setSigningKey(secretTokey(secret))
                .build()
                .parseClaimsJws(token)
                .getBody();
    }

    // Kiểm tra token hợp lệ (dùng riêng cho filter)
    public boolean validateJwtToken(String token) {
        try {
            Jwts.parser().setSigningKey(secretTokey(secret)).build().parseClaimsJws(token);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    // Trích token từ header Authorization
    public String getTokenFromHeader(String header) {
        if (header != null && header.startsWith("Bearer ")) {
            return header.substring(7);
        }
        return null;
    }
}
