// FactoryDirectorPage.js
import { getCurrentUser } from '../../../services/authService';
import ErrorPage from '../../ErrorPage';
import FactoryDirectorProposalList from './FactoryDirectorProposalList';

function FactoryDirectorPage()
{
    const user = getCurrentUser();
    const isDirector = user?.roleName === 'Factory Director';

    if (!isDirector)
    {
        return <ErrorPage
            code={403}
            title="Access Forbidden"
            message="Only Factory Directors can view this page."
        />;
    }

    return (
        <div>
            <FactoryDirectorProposalList approverId={user.id} />
        </div>
    );
}

export default FactoryDirectorPage;
