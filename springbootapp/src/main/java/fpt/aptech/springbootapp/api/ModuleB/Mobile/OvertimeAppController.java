package fpt.aptech.springbootapp.api.ModuleB.Mobile;

import fpt.aptech.springbootapp.dtos.ModuleB.Mobile.OvertimeInviteDTO;
import fpt.aptech.springbootapp.dtos.ModuleB.Mobile.OvertimeResponseDTO;
import fpt.aptech.springbootapp.services.interfaces.OvertimeTicketService;
import fpt.aptech.springbootapp.services.System.UserService;
import fpt.aptech.springbootapp.entities.Core.TbUser;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/app/overtime")
public class OvertimeAppController {

    private final OvertimeTicketService overtimeTicketService;
    private final UserService userService;

    @Autowired
    public OvertimeAppController(OvertimeTicketService overtimeTicketService, UserService userService) {
        this.overtimeTicketService = overtimeTicketService;
        this.userService = userService;
    }

    @GetMapping("/my-invites")
    public ResponseEntity<List<OvertimeInviteDTO>> getMyInvites(Authentication authentication) {
        if (authentication == null) return ResponseEntity.status(401).build();

        String email = authentication.getName();

        TbUser user = userService.findByEmail(email).orElse(null);

        if (user == null) return ResponseEntity.status(404).build();

        return ResponseEntity.ok(overtimeTicketService.getMobileInvites(user.getId()));
    }

    @PostMapping("/respond")
    public ResponseEntity<?> respondToInvite(@RequestBody OvertimeResponseDTO body, Authentication authentication) {
        if (authentication == null) return ResponseEntity.status(401).build();

        String email = authentication.getName();
        TbUser user = userService.findByEmail(email).orElse(null);

        if (user == null) return ResponseEntity.status(404).build();

        try {
            overtimeTicketService.respondToInvite(user.getId(), body.getTicketId(), body.getStatus());
            return ResponseEntity.ok().body("{\"message\": \"Success\"}");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}