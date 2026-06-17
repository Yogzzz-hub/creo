import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

interface WelcomeEmailProps {
  full_name: string;
  portal_url: string;
}

const BRAND_COLOR = "#2B7BC4";
const BRAND_LIGHT = "#E8F4FD";
const DEEP_NAVY = "#0D2137";

export const WelcomeEmail = ({
  full_name = "there",
  portal_url = "https://creo.app/portal",
}: WelcomeEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>Welcome to Creo — your digital marketing partner</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Section style={headerStyle}>
            <Heading style={logoStyle}>Creo</Heading>
          </Section>

          <Section style={contentStyle}>
            <Heading as="h1" style={headingStyle}>
              Welcome to Creo, {full_name}!
            </Heading>

            <Text style={paragraphStyle}>
              We&apos;re thrilled to have you on board. Creo is your all-in-one
              digital marketing platform — designed to help your brand create
              stunning content, manage campaigns, and grow your online presence
              effortlessly.
            </Text>

            <Text style={paragraphStyle}>
              Your account is now active and your dedicated team is ready to get
              started. Here&apos;s what you can do next:
            </Text>

            <Text style={listItemStyle}>✓ Access your client portal</Text>
            <Text style={listItemStyle}>✓ View your content calendar</Text>
            <Text style={listItemStyle}>✓ Track deliverables in real time</Text>
            <Text style={listItemStyle}>✓ Manage your plan and billing</Text>

            <Section style={buttonContainerStyle}>
              <Button href={portal_url} style={buttonStyle}>
                Go to Your Portal
              </Button>
            </Section>

            <Text style={paragraphStyle}>
              If you have any questions, our support team is just a message
              away. We&apos;re here to help you every step of the way.
            </Text>

            <Text style={signatureStyle}>
              Cheers,
              <br />
              The Creo Team
            </Text>
          </Section>

          <Hr style={hrStyle} />

          <Section style={footerStyle}>
            <Text style={footerTextStyle}>
              © {new Date().getFullYear()} Creo — Digital Marketing Agency
              Platform
            </Text>
            <Text style={footerTextStyle}>
              You received this email because you signed up at creo.app.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default WelcomeEmail;

const bodyStyle: React.CSSProperties = {
  backgroundColor: BRAND_LIGHT,
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  margin: "0",
  padding: "0",
};

const containerStyle: React.CSSProperties = {
  backgroundColor: "#ffffff",
  borderRadius: "8px",
  boxShadow: "0 1px 3px rgba(13, 33, 55, 0.08)",
  margin: "40px auto",
  maxWidth: "600px",
  overflow: "hidden",
};

const headerStyle: React.CSSProperties = {
  backgroundColor: DEEP_NAVY,
  padding: "32px 40px",
  textAlign: "center" as const,
};

const logoStyle: React.CSSProperties = {
  color: BRAND_COLOR,
  fontSize: "28px",
  fontWeight: "700",
  margin: "0",
};

const contentStyle: React.CSSProperties = {
  padding: "40px",
};

const headingStyle: React.CSSProperties = {
  color: DEEP_NAVY,
  fontSize: "24px",
  fontWeight: "700",
  margin: "0 0 16px",
};

const paragraphStyle: React.CSSProperties = {
  color: "#374151",
  fontSize: "15px",
  lineHeight: "24px",
  margin: "0 0 16px",
};

const listItemStyle: React.CSSProperties = {
  color: "#374151",
  fontSize: "15px",
  lineHeight: "24px",
  margin: "0 0 8px",
};

const buttonContainerStyle: React.CSSProperties = {
  margin: "32px 0",
  textAlign: "center" as const,
};

const buttonStyle: React.CSSProperties = {
  backgroundColor: BRAND_COLOR,
  borderRadius: "8px",
  color: "#ffffff",
  fontSize: "16px",
  fontWeight: "600",
  padding: "14px 32px",
  textDecoration: "none",
  display: "inline-block",
};

const signatureStyle: React.CSSProperties = {
  color: "#374151",
  fontSize: "15px",
  lineHeight: "24px",
  margin: "24px 0 0",
};

const hrStyle: React.CSSProperties = {
  borderColor: "#C9DFF0",
  margin: "0",
};

const footerStyle: React.CSSProperties = {
  padding: "24px 40px",
  textAlign: "center" as const,
};

const footerTextStyle: React.CSSProperties = {
  color: "#6BAED6",
  fontSize: "12px",
  lineHeight: "18px",
  margin: "0 0 4px",
};
