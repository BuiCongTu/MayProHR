package fpt.aptech.demopj.service;

import fpt.aptech.demopj.entities.Users;
import org.apache.catalina.User;

import java.util.List;
import java.util.Optional;

public interface UserService {
    Users saveUser(Users user);
    Optional<Users> findByEmail(String email);
    List<Users> findAll();
}
