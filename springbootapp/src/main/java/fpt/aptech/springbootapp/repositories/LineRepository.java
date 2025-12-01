package fpt.aptech.springbootapp.repositories;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import fpt.aptech.springbootapp.entities.Core.TbLine;

public interface LineRepository extends JpaRepository<TbLine, Integer> {

    List<TbLine> findByDepartmentId(Integer departmentId);
    // List<TbLine> findByLevel(Integer level);

    //find line by departmentId and level
    // List<TbLine> findByDepartmentIdAndLevel(Integer departmentId, Integer level);
    //find line by departmentId and parent is null
    List<TbLine> findByDepartmentIdAndParentIsNull(Integer departmentId);

    //find line by parentId
    // List<TbLine> findByParentId(Integer parentId);
    // find line by parentId and level
    // List<TbLine> findByParentIdAndLevel(Integer parentId, Integer level);
    // tim toan bo depart
//     @Query(value = """
//     WITH RECURSIVE line_hierarchy AS (
//         SELECT id, parent_id, level, name, department_id 
//         FROM tbLine 
//         WHERE department_id = :departmentId AND parent_id IS NULL
//         UNION ALL
//         SELECT l.id, l.parent_id, l.level, l.name, l.department_id
//         FROM tbLine l
//         INNER JOIN line_hierarchy lh ON l.parent_id = lh.id
//     )
//     SELECT * FROM line_hierarchy ORDER BY level, name
// """, nativeQuery = true)
//     List<TbLine> findLineHierarchyByDepartment(@Param("departmentId") Integer departmentId);
//     // tim toan bo parent cua lineId
//     @Query(value = """
//         WITH RECURSIVE line_ancestors AS (
//             SELECT id, parent_id, level, name
//             FROM tbLine
//             WHERE id = :lineId
//             UNION ALL
//             SELECT l.id, l.parent_id, l.level, l.name
//             FROM tbLine l
//             INNER JOIN line_ancestors la ON l.id = la.parent_id
//         )
//         SELECT * FROM line_ancestors
//     """, nativeQuery = true)
//     List<TbLine> findAncestors(@Param("lineId") Integer lineId);
//     // tim dday du tu root den lineId
//     @Query(value = """
//         WITH RECURSIVE line_path AS (
//             SELECT id, parent_id, level, name
//             FROM tbLine
//             WHERE id = :lineId
//             UNION ALL
//             SELECT l.id, l.parent_id, l.level, l.name
//             FROM tbLine l
//             INNER JOIN line_path lp ON l.id = lp.parent_id
//         )
//         SELECT * FROM line_path ORDER BY level ASC
//     """, nativeQuery = true)
//     List<TbLine> findPathToRoot(@Param("lineId") Integer lineId);
}
