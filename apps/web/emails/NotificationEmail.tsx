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

interface NotificationEmailProps {
  title: string;
  message: string;
  action_url?: string;
  action_label?: string;
}

const BRAND_COLOR = "#2B7BC4";
const BRAND_LIGHT = "#E8F4FD";
const DEEP_NAVY = "#0D2137";

export const NotificationEmail = ({
  title = "New Notification",
  message = "You have a new update.",
  action_url,
  action_label = "View Details",
}: NotificationEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>{title}</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Section style={headerStyle}>
            <Heading style={logoStyle}>Creo</Heading>
          </Section>

          <Section style={contentStyle}>
            <Heading as="h1" style={headingStyle}>
              {title}
            </Heading>

            <Text style={paragraphStyle}>{message}</Text>

            {action_url && (
              <Section style={buttonContainerStyle}>
                <Button href={action_url} style={buttonStyle}>
                  {action_label}
                </Button>
              </Section>
            )}
          </Section>

          <Hr style={hrStyle} />

          <Section style={footerStyle}>
            <Text style={footerTextStyle}>
              This is an automated notification from Creo — Digital Marketing
              Agency Platform.
            </Text>
            <Text style={footerTextStyle}>
              If you no longer wish to receive these emails, update your
              preferences in your account settings.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default NotificationEmail;

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
  fontSize: "22px",
  fontWeight: "700",
  margin: "0 0 16px",
};

const paragraphStyle: React.CSSProperties = {
  color: "#374151",
  fontSize: "15px",
  lineHeight: "24px",
  margin: "0 0 16px",
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
