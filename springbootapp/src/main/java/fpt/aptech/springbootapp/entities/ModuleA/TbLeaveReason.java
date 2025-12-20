package fpt.aptech.springbootapp.entities.ModuleA;

import java.util.ArrayList;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Lob;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@Entity
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "tbLeaveReason")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})

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

    @OneToMany(mappedBy = "leaveReason", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<TbLeaveRequest> leaveRequests = new ArrayList<>();

}
