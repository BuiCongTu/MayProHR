package fpt.aptech.demopj.api;

import fpt.aptech.demopj.Jwt.JwtTokenUtil;
import fpt.aptech.demopj.Repository.UserRepository;
import fpt.aptech.demopj.entities.Users;
import fpt.aptech.demopj.service.EmailService;
import fpt.aptech.demopj.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin("*")
public class AuthController {

    @Autowired
    private UserService userService;

    @Autowired
    private JwtTokenUtil jwtTokenUtil;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private EmailService emailService;

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody Users user) {
        if (userService.findByEmail(user.getEmail()).isPresent()) {
            return ResponseEntity.badRequest().body("Email already in use");
        }

        userService.saveUser(user);
        return ResponseEntity.ok("User registered successfully");
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Users user) {
        var found = userService.findByEmail(user.getEmail());

        if (found.isPresent()) {
            Users existingUser = found.get();

            if (passwordEncoder.matches(user.getPassword(), existingUser.getPassword())) {
                // tạo token có role thực
                String token = jwtTokenUtil.generateToken(existingUser.getEmail(), existingUser.getRole());

                return ResponseEntity.ok(token);
            }
        }

        return ResponseEntity.status(401).body("Invalid email or password");
    }


    @PostMapping("/forgot-pass")
    public ResponseEntity<?> forgotPass(@RequestParam String email) {
        Optional<Users> userOpt = userRepository.findByEmail(email);

        if (userOpt.isEmpty()) {
            return ResponseEntity.badRequest().body("Email not found");
        }

        Users user = userOpt.get();

        // Tạo token reset password
        String token = UUID.randomUUID().toString();
        user.setResetToken(token);
        userRepository.save(user);

        String resetLink = "http://localhost:9999/api/auth/reset-pass?token=" + token;
        emailService.sendEmail(email, "Reset Your Password",
                "Click this link to reset your password: " + resetLink);

        return ResponseEntity.ok("Reset link sent to your email!");
    }


    @PostMapping("/reset-pass")
    public ResponseEntity<?> resetPassword(@RequestParam String token, @RequestParam String newPassword) {
        Optional<Users> userOpt = userRepository.findByResetToken(token);

        if (userOpt.isEmpty()) {
            return ResponseEntity.badRequest().body("Invalid or expired token");
        }

        Users user = userOpt.get();
        user.setPassword(passwordEncoder.encode(newPassword));
        user.setResetToken(null); // Xoá token sau khi dùng
        userRepository.save(user);

        return ResponseEntity.ok("Password has been reset successfully");
    }

}
