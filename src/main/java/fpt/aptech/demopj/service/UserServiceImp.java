package fpt.aptech.demopj.service;

import fpt.aptech.demopj.Repository.RoleRepository;
import fpt.aptech.demopj.Repository.UserRepository;
import fpt.aptech.demopj.entities.Role;
import fpt.aptech.demopj.entities.Users;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

@Service
public class UserServiceImp implements UserService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Override
    public Users saveUser(Users user) {
        // Mặc định gán role USER khi đăng ký
        Set<Role> roles = new HashSet<>();
        Role userRole = roleRepository.findByName("USER")
                .orElseGet(() -> roleRepository.save(new Role("USER")));
        roles.add(userRole);
        user.setRoles(roles);

        // Mã hoá password
        user.setPassword(passwordEncoder.encode(user.getPassword()));

        return userRepository.save(user);
    }

    @Override
    public Optional<Users> findByEmail(String email) {
        return userRepository.findByEmail(email);
    }

    @Override
    public List<Users> findAll() {
        return userRepository.findAll();
    }
}
