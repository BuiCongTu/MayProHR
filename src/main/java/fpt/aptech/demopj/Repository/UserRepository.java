package fpt.aptech.demopj.Repository;

import fpt.aptech.demopj.entities.Users;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface UserRepository extends JpaRepository<Users, Integer> {
    Optional<Users> findByEmail(String email);
    Optional<Users> findByResetToken(String resetToken);

}
