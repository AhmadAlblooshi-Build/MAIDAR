# 📧 Amazon SES Setup Guide for MAIDAR Platform

Complete step-by-step guide to set up Amazon SES for sending verification emails, phishing simulations, and notifications.

---

## 📋 **Table of Contents**

1. [Create AWS Account](#step-1-create-aws-account)
2. [Access SES Console](#step-2-access-ses-console)
3. [Verify Email Domain](#step-3-verify-email-domain)
4. [Request Production Access](#step-4-request-production-access)
5. [Create IAM User](#step-5-create-iam-user)
6. [Configure Railway](#step-6-configure-railway)
7. [Test Email Sending](#step-7-test-email-sending)
8. [Monitoring & Best Practices](#step-8-monitoring--best-practices)

---

## **Step 1: Create AWS Account**

### **1.1 Sign Up**
1. Go to https://aws.amazon.com/
2. Click **"Create an AWS Account"**
3. Fill in details:
   - Email address
   - Account name (e.g., "MAIDAR Platform")
   - Password

### **1.2 Payment Information**
- Add credit/debit card
- **Don't worry**: SES is very cheap
  - First 62,000 emails/month: **FREE** (if using EC2)
  - After that: **$0.10 per 1,000 emails**
  - 150,000 emails = **$15/month**

### **1.3 Identity Verification**
- Phone verification required
- SMS or voice call

### **1.4 Support Plan**
- Select **"Basic Support - Free"**
- You don't need paid support for SES

✅ **Checkpoint**: AWS account created and verified

---

## **Step 2: Access SES Console**

### **2.1 Login to AWS Console**
1. Go to https://console.aws.amazon.com/
2. Sign in with your email and password

### **2.2 Navigate to SES**
1. In the search bar at top, type **"SES"**
2. Click **"Amazon Simple Email Service"**
3. **IMPORTANT**: Select region **"US East (N. Virginia)"** (us-east-1)
   - This region has best global delivery
   - Look at top-right corner to confirm region

✅ **Checkpoint**: You're in SES console (us-east-1 region)

---

## **Step 3: Verify Email Domain**

### **3.1 Choose Domain or Email**

**Option A: Verify Domain** (Recommended for production)
- Better deliverability
- Can send from any address @yourdomain.com
- Requires DNS access

**Option B: Verify Single Email** (Quick testing)
- Easy setup
- Only sends from one email
- Good for initial testing

We'll do **both** - email for testing, domain for production.

---

### **3.2 Verify Test Email (Quick Start)**

1. In SES console, click **"Verified identities"** (left sidebar)
2. Click **"Create identity"**
3. Select **"Email address"**
4. Enter your email (e.g., `your-email@gmail.com`)
5. Click **"Create identity"**
6. Check your inbox for verification email from AWS
7. Click the verification link

✅ **Checkpoint**: Email verified (Status: "Verified")

---

### **3.3 Verify Domain (Production)**

#### **Option 1: Using Your Own Domain**

1. In SES console, click **"Verified identities"**
2. Click **"Create identity"**
3. Select **"Domain"**
4. Enter your domain (e.g., `maidar.com`)
5. Select **"Easy DKIM"** ✅ (recommended)
6. Click **"Create identity"**

You'll get **3 DNS records** to add:

**DKIM Records** (for authentication - 3 CNAME records):
```
Name: abc123._domainkey.maidar.com
Type: CNAME
Value: abc123.dkim.amazonses.com

Name: xyz456._domainkey.maidar.com
Type: CNAME
Value: xyz456.dkim.amazonses.com

Name: def789._domainkey.maidar.com
Type: CNAME
Value: def789.dkim.amazonses.com
```

**7. Add DNS Records**
- Go to your domain registrar (e.g., Namecheap, GoDaddy, Cloudflare)
- Add the 3 CNAME records shown in AWS console
- Wait 10-30 minutes for DNS propagation

**8. Verify Status**
- Go back to SES console → Verified identities
- Your domain should show **"Verified"** after DNS propagates
- DKIM status should be **"Successful"**

✅ **Checkpoint**: Domain verified with DKIM

---

#### **Option 2: Using Free Email (Testing)**

If you don't have a domain yet:

1. Verify a Gmail/Outlook email (Step 3.2)
2. **IMPORTANT**: Add recipient emails to verified identities
   - In Sandbox mode, you can ONLY send to verified emails
   - Verify your test email addresses

✅ **Checkpoint**: Email addresses verified

---

## **Step 4: Request Production Access**

### **4.1 Understanding Sandbox vs Production**

**Sandbox Mode** (Default):
- ❌ Can only send to verified emails
- ❌ Max 200 emails/day
- ❌ Max 1 email/second
- ✅ Good for testing

**Production Mode** (After approval):
- ✅ Send to anyone
- ✅ 50,000+ emails/day
- ✅ 14+ emails/second
- ✅ Required for phishing simulations

---

### **4.2 Request Production Access**

1. In SES console, click **"Account dashboard"** (left sidebar)
2. Click **"Request production access"** button
3. Fill out the form:

**Mail Type**: Select **"Transactional"**

**Website URL**: Enter your frontend URL
```
https://maidar-frontend.vercel.app
```

**Use Case Description**: (Copy this template)
```
MAIDAR is a cybersecurity platform that provides human risk intelligence through:

1. Email Verification: Sending verification codes to new users during registration
2. Password Reset: Sending password reset links to authenticated users
3. Phishing Simulations: Sending controlled phishing test emails to employees as part of security awareness training
4. Risk Assessments: Sending assessment invitations and results to organization members
5. System Notifications: Sending campaign completion reports and security alerts

All emails are:
- Opt-in based (users must register/employees must be imported by their organization)
- Professionally formatted with unsubscribe options
- Sent only to verified business email addresses
- Part of a legitimate cybersecurity training platform

We have implemented:
- Email validation to block disposable email domains
- Bounce and complaint handling
- Proper SPF/DKIM/DMARC configuration
- Compliance with anti-spam regulations

Expected volume: 10,000-50,000 emails/month initially, scaling to 500,000/month.
```

**Additional contacts**: Add your email

**Acknowledge compliance**: ✅ Check the box

4. Click **"Submit request"**

---

### **4.3 Wait for Approval**

- **Response time**: Usually 24-48 hours (sometimes faster!)
- **Email notification**: AWS will email you when approved
- **Status**: Check "Account dashboard" for sending limits

**While waiting**: Continue setup, you can test in Sandbox mode

✅ **Checkpoint**: Production access requested

---

## **Step 5: Create IAM User**

### **5.1 Why IAM User?**
- Secure API access
- Separate from root account
- Can revoke/rotate credentials
- Follows AWS best practices

---

### **5.2 Create IAM User**

1. In AWS console, search for **"IAM"**
2. Click **"Users"** (left sidebar)
3. Click **"Create user"**
4. Enter username: `maidar-ses-user`
5. Click **"Next"**

---

### **5.3 Set Permissions**

1. Select **"Attach policies directly"**
2. Search for **"AmazonSESFullAccess"**
3. Check the box next to it
4. Click **"Next"**
5. Click **"Create user"**

---

### **5.4 Create Access Keys**

1. Click on the user you just created (`maidar-ses-user`)
2. Click **"Security credentials"** tab
3. Scroll down to **"Access keys"**
4. Click **"Create access key"**
5. Select **"Application running outside AWS"**
6. Click **"Next"**
7. Add description: `MAIDAR Platform - Railway Backend`
8. Click **"Create access key"**

**🔐 IMPORTANT**: You'll see:
```
Access key ID: AKIAIOSFODNN7EXAMPLE
Secret access key: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
```

**COPY THESE NOW!** You won't be able to see the secret again.

✅ **Checkpoint**: IAM user created with access keys saved

---

## **Step 6: Configure Railway**

### **6.1 Add Environment Variables**

1. Go to https://railway.app/
2. Open your MAIDAR backend project
3. Go to **"Variables"** tab
4. Add these variables:

```bash
# Amazon SES Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY

# Email Configuration
FROM_EMAIL=noreply@maidar.com
FROM_NAME=MAIDAR
```

**Replace** with your actual values:
- `AWS_ACCESS_KEY_ID`: From Step 5.4
- `AWS_SECRET_ACCESS_KEY`: From Step 5.4
- `FROM_EMAIL`: Your verified email/domain

---

### **6.2 Redeploy Backend**

Railway will automatically redeploy with new environment variables.

**Check logs** for:
```
✅ Amazon SES initialized (region: us-east-1)
```

✅ **Checkpoint**: Railway configured with SES credentials

---

## **Step 7: Test Email Sending**

### **7.1 Test Registration**

1. Go to your frontend: https://maidar-frontend.vercel.app
2. Click **"Register"**
3. Fill in the form with a **verified email** (if in Sandbox)
4. Submit

**Expected Result**:
- Email arrives within 10-30 seconds
- Contains 6-digit verification code
- Beautifully formatted HTML email

---

### **7.2 Check Railway Logs**

Look for:
```
✅ Email sent successfully to user@example.com (MessageId: 01000...)
```

---

### **7.3 If Sandbox Mode**

**Error**: `MessageRejected: Email address is not verified`

**Solution**:
- In SES console → Verified identities
- Add recipient email as verified identity
- OR wait for production access approval

---

### **7.4 Test Different Email Types**

Test all email flows:
- ✅ Registration verification
- ✅ Password reset
- ✅ Welcome email
- ✅ (Later) Phishing simulation

✅ **Checkpoint**: Emails sending successfully!

---

## **Step 8: Monitoring & Best Practices**

### **8.1 Monitor Sending**

**SES Dashboard**:
1. Go to SES console → Account dashboard
2. View:
   - Emails sent (last 24 hours)
   - Bounce rate (keep <5%)
   - Complaint rate (keep <0.1%)

---

### **8.2 Handle Bounces**

**Setup SNS notifications** (optional but recommended):

1. In SES console → Verified identities → Your domain
2. Click **"Notifications"** tab
3. Click **"Edit"**
4. Enable:
   - Bounces
   - Complaints

This helps track email deliverability issues.

---

### **8.3 Best Practices**

**1. Warm Up Your Domain**
- Start with low volume (100-500 emails/day)
- Gradually increase over 2-4 weeks
- Don't send 50,000 emails on day 1!

**2. Monitor Metrics**
- Bounce rate <5%
- Complaint rate <0.1%
- Open rate >20% (for phishing simulations)

**3. Implement Unsubscribe**
- Add unsubscribe links to marketing emails
- Honor unsubscribe requests immediately
- Required by law in many countries

**4. Use Professional Content**
- No spammy subject lines
- Include physical address in footer
- Clear sender identification

**5. Maintain Sender Reputation**
- Remove invalid emails from lists
- Don't buy email lists
- Send only to opted-in users

---

### **8.4 Cost Monitoring**

**Set up billing alerts**:
1. AWS Console → Billing Dashboard
2. Create budget alert
3. Set threshold (e.g., $20/month)
4. Get notified if costs exceed

**Expected costs**:
- 50,000 emails/month: **$5**
- 150,000 emails/month: **$15**
- 500,000 emails/month: **$50**

✅ **Checkpoint**: Monitoring setup complete

---

## **🎉 Setup Complete!**

You now have:
- ✅ AWS account created
- ✅ SES configured and verified
- ✅ Production access (pending or approved)
- ✅ IAM user with secure credentials
- ✅ Railway environment configured
- ✅ Email sending working
- ✅ Monitoring in place

---

## **📞 Need Help?**

**Common Issues**:

1. **Emails not arriving**
   - Check Spam folder
   - Verify email/domain in SES
   - Check Railway logs for errors
   - Ensure in Production mode (not Sandbox)

2. **"Email address not verified" error**
   - You're in Sandbox mode
   - Add recipient email to Verified identities
   - OR wait for production access

3. **IAM permission errors**
   - Ensure `AmazonSESFullAccess` policy attached
   - Check access keys are correct in Railway

4. **High bounce rate**
   - Validate email addresses before sending
   - Remove invalid emails from database
   - Check domain reputation

**AWS Support**:
- SES Documentation: https://docs.aws.amazon.com/ses/
- AWS Support Center: https://console.aws.amazon.com/support/

---

## **🚀 Next Steps**

1. ✅ Test all email flows thoroughly
2. ✅ Request production access if not done
3. ✅ Setup domain verification for better deliverability
4. ✅ Configure bounce/complaint handling
5. ✅ Implement email templates for phishing simulations
6. ✅ Monitor sending metrics daily

**Your platform is now ready to send emails at scale!** 📧✨
