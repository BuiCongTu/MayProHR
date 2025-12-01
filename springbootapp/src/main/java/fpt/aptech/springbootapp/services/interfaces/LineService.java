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

    //lấy toàn bộ ccaaus trúc phan cap cua 1 dept
    // List<TbLine> getLineHierarchyByDepartment(Integer departmentId);
    //lấy path đầy đủ từ rôt đến 1 line
    // List<TbLine> getLinePathToRoot(Integer lineId);
    //lấy tát cả parent
    // List<TbLine> getLineAncestors(Integer lineId);
    //lấy line theo level
    // List<TbLine> getLineByLevel(Integer departmentId, Integer level);
    //lấy toàn bộ Lines của dept
    // TbLine getLineTreeByDepartment(Integer departmentId);
}
