package fpt.aptech.springbootapp.services.interfaces;

//import fpt.aptech.springbootapp.dtos.response.LineDto;
import java.util.List;

import fpt.aptech.springbootapp.entities.Core.TbLine;

public interface LineService {

    List<TbLine> getLinesByDepartment(Integer departmentId);

    //lấy các child line của 1 line
    List<TbLine> getChildLines(Integer parentLineId);

    //llaasy rôt lines của 1 dept
    List<TbLine> getRootLines(Integer departmentId);

    boolean isAncestor(Integer ancestorId, Integer childId);

    Integer getParentId(Integer lineId);

    List<Integer> getAllDescendantIds(Integer parentLineId);
}
