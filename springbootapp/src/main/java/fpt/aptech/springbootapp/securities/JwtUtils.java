package fpt.aptech.springbootapp.securities;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.Date;

@Component
public class JwtUtils {
    private static final String secret = "AIzaSyB8dmLwCiGmIH82ZCCBPWP9IECoBapa27A";
    public String generateToken(String username) {
        return Jwts.builder().setSubject(username)
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis()+1000*60*60*10))
                .signWith(secretTokey(secret)).compact();
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

//    vong doi
    public Date extractExpiration(String token) {
        return Jwts.parser().setSigningKey(secretTokey(secret)).build()
                .parseClaimsJws(token).getBody().getExpiration();
    }
    public boolean validateToken(String token, String username) {
        return (username.equals(extractUsername(token)) && !isTokenExpired(token));
    }
}
