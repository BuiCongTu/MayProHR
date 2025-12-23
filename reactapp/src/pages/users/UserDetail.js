import { useLocation, useNavigate } from 'react-router-dom';
import { Card, Button, Row, Col, Badge } from 'react-bootstrap';

const UserDetail = () => {
    const { state } = useLocation();
    const navigate = useNavigate();

    const user = state?.user;

    if (!user) {
        return (
            <div className="p-4">
                <p>⚠️ No user data found.</p>
                <Button onClick={() => navigate(-1)}>Back</Button>
            </div>
        );
    }

    return (
        <div className="p-4">
            <Button variant="secondary" className="mb-3" onClick={() => navigate(-1)}>
                ← Back
            </Button>

            <Card>
                <Card.Header>
                    <h5>{user.fullName}</h5>
                </Card.Header>

                <Card.Body>
                    <Row className="mb-2">
                        <Col md={4}><strong>Phone:</strong></Col>
                        <Col md={8}>{user.phone || '-'}</Col>
                    </Row>

                    <Row className="mb-2">
                        <Col md={4}><strong>Department:</strong></Col>
                        <Col md={8}>{user.departmentName || '-'}</Col>
                    </Row>

                    <Row className="mb-2">
                        <Col md={4}><strong>Line:</strong></Col>
                        <Col md={8}>{user.lineName || '-'}</Col>
                    </Row>

                    <Row className="mb-2">
                        <Col md={4}><strong>Sub Line:</strong></Col>
                        <Col md={8}>{user.subLineName || '-'}</Col>
                    </Row>

                    <Row className="mb-2">
                        <Col md={4}><strong>Work Unit:</strong></Col>
                        <Col md={8}>{user.workUnitName || '-'}</Col>
                    </Row>

                    <Row className="mb-2">
                        <Col md={4}><strong>Salary Type:</strong></Col>
                        <Col md={8}>
                            <Badge bg={user.salaryType === 'TimeBased' ? 'primary' : 'warning'}>
                                {user.salaryType}
                            </Badge>
                        </Col>
                    </Row>
                </Card.Body>
            </Card>
        </div>
    );
};

export default UserDetail;
