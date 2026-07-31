import * as React from 'react';
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
  Hr,
} from '@react-email/components';

export const PasswordChangedEmail = () => {
  return (
    <Html>
      <Head />
      <Preview>Security Alert: Your ShortForge AI Password was Changed</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Password Changed Successfully</Heading>
          
          <Text style={text}>
            We are writing to let you know that the password for your ShortForge AI account has been successfully updated.
          </Text>
          
          <Hr style={hr} />
          
          <Text style={warningText}>
            <strong>Security Warning:</strong> If you did not make this change, please contact our support team immediately to secure your account. 
            Do not share your account details with anyone.
          </Text>
          
          <Text style={footer}>
            ShortForge AI - Security Team
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default PasswordChangedEmail;

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '40px 20px',
  borderRadius: '8px',
  boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
  maxWidth: '480px',
};

const h1 = {
  color: '#1e293b',
  fontSize: '24px',
  fontWeight: '600',
  lineHeight: '1.25',
  marginBottom: '24px',
  textAlign: 'center' as const,
};

const text = {
  color: '#475569',
  fontSize: '16px',
  lineHeight: '1.5',
  marginBottom: '20px',
};

const hr = {
  borderColor: '#e2e8f0',
  margin: '24px 0',
};

const warningText = {
  color: '#ef4444',
  fontSize: '13px',
  lineHeight: '1.5',
  marginBottom: '20px',
};

const footer = {
  color: '#94a3b8',
  fontSize: '12px',
  lineHeight: '1.5',
  textAlign: 'center' as const,
};
