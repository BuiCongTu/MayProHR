package fpt.aptech.springbootapp.entities.ModuleA;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "tbLeaveReason")
public class TbLeaveReason {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "leave_reason_id", nullable = false)
    private Integer id;

    @Size(max = 255)
    @NotNull
    @Column(name = "reason", nullable = false)
    private String reason;

    @Lob
    @Column(name = "description")
    private String description;

}