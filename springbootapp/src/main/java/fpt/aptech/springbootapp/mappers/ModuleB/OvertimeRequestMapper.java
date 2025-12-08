package fpt.aptech.springbootapp.mappers.ModuleB;

import fpt.aptech.springbootapp.dtos.ModuleB.OvertimeRequestDTO;
import fpt.aptech.springbootapp.dtos.ModuleB.OvertimeRequestDetailDTO;
import fpt.aptech.springbootapp.entities.ModuleB.TbOvertimeRequest;
import fpt.aptech.springbootapp.entities.ModuleB.TbOvertimeRequestDetail;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring", uses = {OvertimeTicketMapper.class})
public interface OvertimeRequestMapper {

    @Mapping(source = "factoryManager.id", target = "factoryManagerId")
    @Mapping(source = "factoryManager.fullName", target = "factoryManagerName")
    @Mapping(source = "department.id", target = "departmentId")
    @Mapping(source = "department.name", target = "departmentName")
    @Mapping(source = "overtimeTickets", target = "overtimeTickets")
    @Mapping(source = "lineDetails", target = "lineDetails")
    OvertimeRequestDTO toDTO(TbOvertimeRequest request);

    @Mapping(source = "factoryManagerId", target = "factoryManager.id")
    @Mapping(source = "departmentId", target = "department.id")
    @Mapping(target = "overtimeTime", ignore = true)
    @Mapping(target = "overtimeTickets", ignore = true)
    @Mapping(source = "lineDetails", target = "lineDetails")
    TbOvertimeRequest toEntity(OvertimeRequestDTO dto);

    @Mapping(source = "line.id", target = "lineId")
    @Mapping(source = "line.name", target = "lineName")
    @Mapping(source = "line.level", target = "lineLevel")
    OvertimeRequestDetailDTO toDetailDTO(TbOvertimeRequestDetail detail);

    @Mapping(source = "lineId", target = "line.id")
    TbOvertimeRequestDetail toDetailEntity(OvertimeRequestDetailDTO detailDTO);
}