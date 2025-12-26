import { useEffect, useState } from 'react';
import { Alert, Badge, Button, Card, Col, Container, Form, ListGroup, Row, Spinner } from 'react-bootstrap';
import { FaCalendarAlt, FaChartLine, FaExclamationTriangle, FaLightbulb, FaRobot, FaUsers } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser } from '../../services/authService';
import { analyzePayroll, hasAnalysisPermission } from '../../services/moduleC/payrollAnalysisService';
import '../../styles/payroll.css';

const PayrollAnalysis = () =>
{
  const navigate = useNavigate();
  const currentUser = getCurrentUser();

  // Check permission
  const hasPermission = hasAnalysisPermission(currentUser);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [analysis, setAnalysis] = useState(null);

  // Form state
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [analysisType, setAnalysisType] = useState('all');
  const [compareWithPrevious, setCompareWithPrevious] = useState(true);

  useEffect(() =>
  {
    // Redirect if no permission
    if (!hasPermission)
    {
      navigate('/payroll');
    }
  }, [hasPermission, navigate]);

  const handleAnalyze = async (e) =>
  {
    e.preventDefault();
    setLoading(true);
    setError('');
    setAnalysis(null);

    try
    {
      const request = {
        year,
        month,
        analysisType,
        compareWithPrevious,
        language: 'vi'
      };

      const result = await analyzePayroll(request);
      setAnalysis(result);
    } catch (err)
    {
      console.error('Analysis error:', err);
      setError(err.response?.data?.message || err.message || 'command failed. Please try again.');
    } finally
    {
      setLoading(false);
    }
  };

  const formatCurrency = (value) =>
  {
    if (!value) return '0 ₫';
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0
    }).format(value);
  };

  const getSeverityColor = (severity) =>
  {
    switch (severity?.toLowerCase())
    {
      case 'critical': return 'danger';
      case 'warning': return 'warning';
      case 'info': return 'info';
      default: return 'secondary';
    }
  };

  const getPriorityColor = (priority) =>
  {
    switch (priority?.toLowerCase())
    {
      case 'high': return 'danger';
      case 'medium': return 'warning';
      case 'low': return 'info';
      default: return 'secondary';
    }
  };

  if (!hasPermission)
  {
    return null; // Will redirect
  }

  return (
    <Container fluid className="p-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>
          <FaRobot className="me-2" />
          AI Payroll Analysis
          <Badge bg="info" className="ms-2">Powered by Gemini AI</Badge>
        </h2>
        <Button variant="outline-secondary" onClick={() => navigate('/payroll')}>
          &larr; Back to Payroll
        </Button>
      </div>

      {/* Analysis Form */}
      <Card className="mb-4 shadow-sm">
        <Card.Header className="bg-primary text-white">
          <FaCalendarAlt className="me-2" />
          Select Analysis Period
        </Card.Header>
        <Card.Body>
          <Form onSubmit={handleAnalyze}>
            <Row>
              <Col md={3}>
                <Form.Group className="mb-3">
                  <Form.Label>Year</Form.Label>
                  <Form.Select
                    value={year}
                    onChange={(e) => setYear(parseInt(e.target.value))}
                  >
                    {[2024, 2025, 2026].map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group className="mb-3">
                  <Form.Label>Month</Form.Label>
                  <Form.Select
                    value={month}
                    onChange={(e) => setMonth(parseInt(e.target.value))}
                  >
                    {[...Array(12)].map((_, i) => (
                      <option key={i + 1} value={i + 1}>Month {i + 1}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group className="mb-3">
                  <Form.Label>Analysis Type</Form.Label>
                  <Form.Select
                    value={analysisType}
                    onChange={(e) => setAnalysisType(e.target.value)}
                  >
                    <option value="all">All</option>
                    <option value="overview">Overview</option>
                    <option value="anomaly">Anomaly</option>
                    <option value="recommendations">Recommendations</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group className="mb-3">
                  <Form.Label>&nbsp;</Form.Label>
                  <div>
                    <Form.Check
                      type="checkbox"
                      label="Compare with previous month"
                      checked={compareWithPrevious}
                      onChange={(e) => setCompareWithPrevious(e.target.checked)}
                    />
                  </div>
                </Form.Group>
              </Col>
            </Row>
            <Button
              type="submit"
              variant="success"
              disabled={loading}
              className="w-100"
            >
              {loading ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Analyzing with AI...
                </>
              ) : (
                <>
                  <FaRobot className="me-2" />
                  Analyze Now
                </>
              )}
            </Button>
          </Form>
        </Card.Body>
      </Card>

      {/* Error Message */}
      {error && (
        <Alert variant="danger" dismissible onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Analysis Results */}
      {analysis && (
        <>
          {/* AI Summary */}
          {analysis.aiSummary && (
            <Card className="mb-4 shadow-sm border-success">
              <Card.Header className="bg-success text-white">
                <FaRobot className="me-2" />
                AI Analysis Summary
              </Card.Header>
              <Card.Body>
                <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.8' }}>
                  {analysis.aiSummary}
                </div>
              </Card.Body>
            </Card>
          )}

          {/* Overview */}
          {analysis.overview && (
            <Card className="mb-4 shadow-sm">
              <Card.Header className="bg-info text-white">
                <FaChartLine className="me-2" />
                Overview
              </Card.Header>
              <Card.Body>
                <Row>
                  <Col md={3} className="mb-3">
                    <div className="text-center p-3 bg-light rounded">
                      <FaUsers className="text-primary mb-2" size={30} />
                      <h6 className="text-muted mb-1">Total Employees</h6>
                      <h3 className="text-primary">{analysis.overview.totalEmployees}</h3>
                    </div>
                  </Col>
                  <Col md={3} className="mb-3">
                    <div className="text-center p-3 bg-light rounded">
                      <h6 className="text-muted mb-1">Total Cost</h6>
                      <h5 className="text-danger">
                        {formatCurrency(analysis.overview.totalPayrollCost)}
                      </h5>
                    </div>
                  </Col>
                  <Col md={3} className="mb-3">
                    <div className="text-center p-3 bg-light rounded">
                      <h6 className="text-muted mb-1">Average Salary</h6>
                      <h5 className="text-success">
                        {formatCurrency(analysis.overview.averageSalary)}
                      </h5>
                    </div>
                  </Col>
                  <Col md={3} className="mb-3">
                    <div className="text-center p-3 bg-light rounded">
                      <h6 className="text-muted mb-1">Total OT</h6>
                      <h5 className="text-warning">
                        {formatCurrency(analysis.overview.totalOvertimePay)}
                      </h5>
                    </div>
                  </Col>
                </Row>

                {/* Top Earners */}
                {analysis.overview.topEarners && analysis.overview.topEarners.length > 0 && (
                  <div className="mt-3">
                    <h6 className="text-muted mb-2">Top 5 Highest Earners:</h6>
                    <ListGroup variant="flush">
                      {analysis.overview.topEarners.map((earner, index) => (
                        <ListGroup.Item key={index}>
                          <Badge bg="primary" className="me-2">#{index + 1}</Badge>
                          {earner}
                        </ListGroup.Item>
                      ))}
                    </ListGroup>
                  </div>
                )}
              </Card.Body>
            </Card>
          )}

          {/* Anomalies */}
          {analysis.anomalies && analysis.anomalies.length > 0 && (
            <Card className="mb-4 shadow-sm border-warning">
              <Card.Header className="bg-warning text-dark">
                <FaExclamationTriangle className="me-2" />
                Anomalies Detected ({analysis.anomalies.length})
              </Card.Header>
              <Card.Body>
                <ListGroup variant="flush">
                  {analysis.anomalies.map((anomaly, index) => (
                    <ListGroup.Item key={index} className="border-start border-3 border-warning">
                      <div className="d-flex justify-content-between align-items-start">
                        <div className="flex-grow-1">
                          <div className="d-flex align-items-center mb-2">
                            <Badge bg={getSeverityColor(anomaly.severity)} className="me-2">
                              {anomaly.severity}
                            </Badge>
                            <strong>{anomaly.userName}</strong>
                          </div>
                          <p className="mb-1">{anomaly.description}</p>
                          {anomaly.recommendation && (
                            <small className="text-muted">
                              <FaLightbulb className="me-1" />
                              {anomaly.recommendation}
                            </small>
                          )}
                        </div>
                        {anomaly.actualValue && (
                          <div className="text-end ms-3">
                            <small className="text-muted">Value</small>
                            <div className="fw-bold">
                              {formatCurrency(anomaly.actualValue)}
                            </div>
                          </div>
                        )}
                      </div>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              </Card.Body>
            </Card>
          )}

          {/* Recommendations */}
          {analysis.recommendations && analysis.recommendations.length > 0 && (
            <Card className="mb-4 shadow-sm border-primary">
              <Card.Header className="bg-primary text-white">
                <FaLightbulb className="me-2" />
                Optimization Suggestions ({analysis.recommendations.length})
              </Card.Header>
              <Card.Body>
                {analysis.recommendations.map((rec, index) => (
                  <Card key={index} className="mb-3 border-start border-3 border-primary">
                    <Card.Body>
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <h6 className="mb-0">{rec.title}</h6>
                        <Badge bg={getPriorityColor(rec.priority)}>
                          {rec.priority}
                        </Badge>
                      </div>
                      <p className="text-muted mb-2">{rec.description}</p>
                      {rec.actionItems && rec.actionItems.length > 0 && (
                        <div>
                          <small className="text-muted d-block mb-1">
                            <strong>Actions:</strong>
                          </small>
                          <ul className="mb-0">
                            {rec.actionItems.map((item, i) => (
                              <li key={i}><small>{item}</small></li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {rec.estimatedImpact && parseFloat(rec.estimatedImpact) > 0 && (
                        <div className="mt-2">
                          <Badge bg="success">
                            Estimated Savings: {formatCurrency(rec.estimatedImpact)}
                          </Badge>
                        </div>
                      )}
                    </Card.Body>
                  </Card>
                ))}
              </Card.Body>
            </Card>
          )}

          {/* Comparison */}
          {analysis.comparison && analysis.comparison.summary && (
            <Card className="mb-4 shadow-sm">
              <Card.Header className="bg-secondary text-white">
                <FaChartLine className="me-2" />
                Comparison with Previous Month
              </Card.Header>
              <Card.Body>
                <Alert variant={
                  analysis.comparison.trend === 'increasing' ? 'danger' :
                    analysis.comparison.trend === 'decreasing' ? 'success' : 'info'
                }>
                  {analysis.comparison.summary}
                </Alert>
              </Card.Body>
            </Card>
          )}
        </>
      )}
    </Container>
  );
};

export default PayrollAnalysis;
