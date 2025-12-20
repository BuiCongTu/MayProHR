import { getCurrentUser } from '../../../services/authService';
import ErrorPage from '../../ErrorPage';
import ProposalList from './ProposalList';
import SkillProposalForm from './SkillProposalForm';

function SkillProposalPage()
{
    const user = getCurrentUser();
    const isManager = user?.roleName === 'Factory Manager' || user?.roleName === 'MGR';

    if (!isManager)
    {
        return <ErrorPage code={403} title="Access Forbidden" message="Only Managers can submit skill proposals." />;
    }

    return (
        <>
            <SkillProposalForm proposerId={user.id} />
            <ProposalList
                title="Skill Proposals"
                mode="view"
                proposalType="skill-level"
                filterByProposerId={user.id}  // chỉ lấy proposal của manager này
                defaultStatus=""
            />
        </>
    );
}

export default SkillProposalPage;
