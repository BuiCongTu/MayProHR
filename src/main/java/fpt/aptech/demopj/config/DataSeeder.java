package fpt.aptech.demopj.config;

import fpt.aptech.demopj.Repository.UserRepository;
import fpt.aptech.demopj.entities.Users;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class DataSeeder implements CommandLineRunner {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) throws Exception {
        if (userRepository.findByEmail("admin@admin.com").isEmpty()) {
            Users admin = new Users();
            admin.setEmail("admin@admin.com");
            admin.setFullname("Admin User");
            admin.setPassword(passwordEncoder.encode("admin"));
            admin.setRole("ADMIN");
            userRepository.save(admin);
            System.out.println("Admin account created: admin@admin.com / admin");
        }

        if (userRepository.findByEmail("user@user.com").isEmpty()) {
            Users user = new Users();
            user.setEmail("user@user.com");
            user.setFullname("Normal User");
            user.setPassword(passwordEncoder.encode("user"));
            user.setRole("USER");
            userRepository.save(user);
            System.out.println("User account created: user@user.com / user");
        }
    }
}
