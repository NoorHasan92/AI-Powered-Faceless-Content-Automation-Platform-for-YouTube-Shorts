import * as React from 'react';
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
  Hr,
} from '@react-email/components';

interface ResetPasswordEmailProps {
  otp: string;
}

export const ResetPasswordEmail = ({ otp }: ResetPasswordEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>Your ShortForge AI Password Reset Code</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Password Reset Request</Heading>
          
          <Text style={text}>
            We received a request to reset the password for your ShortForge AI account. 
            Use the following 8-digit verification code to complete the process.
          </Text>
          
          <Section style={codeContainer}>
            <Text style={code}>{otp}</Text>
          </Section>
          
          <Text style={text}>
            This code is valid for 15 minutes. 
          </Text>
          
          <Hr style={hr} />
          
          <Text style={warningText}>
            <strong>Security Warning:</strong> If you did not request a password reset, please ignore this email. 
            Do not share this code with anyone. Our support team will never ask for your verification code.
          </Text>
          
          <Text style={footer}>
            ShortForge AI - Automation Platform
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default ResetPasswordEmail;

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

const codeContainer = {
  background: '#f1f5f9',
  borderRadius: '6px',
  margin: '16px 0',
  padding: '16px',
};

const code = {
  color: '#0f172a',
  fontSize: '32px',
  fontWeight: '700',
  letterSpacing: '6px',
  lineHeight: '40px',
  margin: '0',
  textAlign: 'center' as const,
};

const hr = {
  borderColor: '#e2e8f0',
  margin: '24px 0',
};

const warningText = {
  color: '#64748b',
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
