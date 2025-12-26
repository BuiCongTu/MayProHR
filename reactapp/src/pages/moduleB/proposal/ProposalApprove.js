import React from 'react';
import { getCurrentUser } from '../../../services/authService';
import ProposalList from './ProposalList';
import ErrorPage from '../../ErrorPage';

function ProposalApprove() {
    const user = getCurrentUser();

    const isFactoryDirector =
        user?.roleName === 'Factory Director' ||
        user?.roleName === 'FDirector';

    if (!isFactoryDirector) {
        return (
            <ErrorPage
                code={403}
                title="Access Forbidden"
                message="Only Factory Directors can approve position change proposals."
            />
        );
    }

    return (
        <ProposalList
            title="Approve Position Change Proposals"
            mode="approve"
            approverId={user.id}
            defaultStatus="pending"
        />
    );
}

export default ProposalApprove;


// import React from 'react';
// import { getCurrentUser } from '../../../services/authService';
// import ErrorPage from '../../ErrorPage';
// import FactoryDirectorProposalList from './FactoryDirectorProposalList';
//
// function ProposalApprove() {
//     const user = getCurrentUser();
//
//     const isFactoryDirector =
//         user?.roleName === 'Factory Director' ||
//         user?.roleName === 'FDirector';
//
//     if (!isFactoryDirector) {
//         return (
//             <ErrorPage
//                 code={403}
//                 title="Access Forbidden"
//                 message="Only Factory Directors can approve position change proposals."
//             />
//         );
//     }
//
//     return <FactoryDirectorProposalList approverId={user.id} />;
// }
//
// export default ProposalApprove;