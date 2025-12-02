package fpt.aptech.springbootapp.repositories;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import fpt.aptech.springbootapp.entities.Core.TbUser;

@Repository
public interface UserRepository extends JpaRepository<TbUser, Integer> {

    Optional<TbUser> findByPhone(String phone);

    Optional<TbUser> findByEmail(String email);
    // Optional<TbUser> findByResetToken(String phone);

    List<TbUser> findByDepartmentId(Integer departmentId);

    List<TbUser> findByDepartmentIdAndRoleName(Integer departmentId, String roleName);

    List<TbUser> findByRoleName(String roleName);

    List<TbUser> findByRoleNameAndLineId(String roleName, Integer lineId);
}
