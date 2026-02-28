# Disaster Recovery Plan - MAIDAR

**Recovery Time Objective (RTO):** 4 hours
**Recovery Point Objective (RPO):** 6 hours

---

## Overview

This document provides procedures for recovering from catastrophic failures.

### Disaster Scenarios Covered
1. Database corruption/loss
2. Complete infrastructure failure
3. Regional AWS outage
4. Security breach/ransomware
5. Accidental data deletion

---

## 1. Backup Strategy

### Automated Backups

**Database Backups:**
- Frequency: Every 6 hours
- Retention: 30 days local, 90 days S3
- Location: `/var/backups/maidar` and `s3://maidar-backups-production`
- Encryption: GPG with company key

**File Backups:**
- User uploads: Daily to S3
- Application logs: 7 days retention
- Configuration files: Version controlled in Git

### Backup Schedule

```cron
# Crontab configuration
# Run every 6 hours (00:00, 06:00, 12:00, 18:00 UTC)
0 */6 * * * /opt/maidar/scripts/backup/backup-database.sh production >> /var/log/maidar/backup.log 2>&1

# Verify backups daily at 03:00 UTC
0 3 * * * /opt/maidar/scripts/backup/verify-backup.sh $(ls -t /var/backups/maidar/*.sql.gz | head -1) >> /var/log/maidar/verify.log 2>&1

# Cleanup old backups weekly
0 4 * * 0 find /var/backups/maidar -name "*.sql.gz*" -mtime +30 -delete
```

### Setup Automated Backups

```bash
# 1. Make scripts executable
chmod +x scripts/backup/*.sh

# 2. Install crontab
crontab -e

# 3. Add backup jobs (see above)

# 4. Verify cron is running
sudo systemctl status cron

# 5. Test backup
./scripts/backup/backup-database.sh production

# 6. Verify backup created
ls -lh /var/backups/maidar/
```

---

## 2. Recovery Procedures

### Scenario 1: Database Corruption

**Symptoms:**
- Database errors in application logs
- Data inconsistency
- Failed queries

**Recovery Steps:**

```bash
# 1. Identify issue
tail -f /var/log/maidar/backend.log

# 2. Stop application
kubectl scale deployment maidar-backend --replicas=0

# 3. List available backups
ls -lh /var/backups/maidar/
# or
aws s3 ls s3://maidar-backups-production/

# 4. Restore from latest backup
./scripts/backup/restore-database.sh \
    /var/backups/maidar/maidar-production-YYYYMMDD-HHMMSS.sql.gz.gpg \
    production

# 5. Verify restore
psql -U postgres -d maidar -c "SELECT COUNT(*) FROM users;"

# 6. Restart application
kubectl scale deployment maidar-backend --replicas=3

# 7. Test application
curl https://api.maidar.com/health

# 8. Monitor for 1 hour
watch -n 30 'curl -s https://api.maidar.com/health | jq'
```

**Estimated Time:** 1-2 hours

---

### Scenario 2: Complete Infrastructure Failure

**Symptoms:**
- All services down
- AWS region unavailable
- Cannot access infrastructure

**Recovery Steps:**

```bash
# 1. Deploy infrastructure from scratch using Terraform
cd terraform/
terraform init
terraform apply -auto-approve

# 2. Restore database from S3 backup
# (Download backup from S3 to new instance)
aws s3 cp s3://maidar-backups-production/latest.sql.gz.gpg .

# 3. Decrypt and restore
gpg --decrypt latest.sql.gz.gpg > latest.sql.gz
./scripts/backup/restore-database.sh latest.sql.gz production

# 4. Deploy application
# Via GitHub Actions or manually:
docker pull maidar/backend:latest
kubectl apply -f k8s/deployment.yml

# 5. Update DNS
# Point api.maidar.com to new load balancer

# 6. Verify all services
./scripts/verify-production.sh

# 7. Enable monitoring
# Verify Sentry, Prometheus, Grafana
```

**Estimated Time:** 4 hours

---

### Scenario 3: Regional AWS Outage

**Symptoms:**
- Unable to access me-south-1 region
- All AWS services unavailable

**Recovery Steps:**

```bash
# 1. Deploy to backup region (eu-central-1)
cd terraform/
terraform workspace select dr
terraform apply -auto-approve

# 2. Restore from cross-region S3 replication
aws s3 cp s3://maidar-backups-dr/latest.sql.gz.gpg . --region eu-central-1

# 3. Follow infrastructure recovery steps above

# 4. Update DNS to point to DR region
aws route53 change-resource-record-sets \
    --hosted-zone-id Z1234567890 \
    --change-batch file://dns-failover.json

# 5. Monitor performance
# DR region may have higher latency for UAE users
```

**Estimated Time:** 6 hours

---

### Scenario 4: Security Breach / Ransomware

**Symptoms:**
- Unusual system behavior
- Files encrypted
- Ransom note

**Immediate Actions:**

```bash
# 1. DISCONNECT from network immediately
# Prevent spread of ransomware

# 2. Do NOT restart servers
# Preserve evidence

# 3. Contact security team
# Email: security@company.com
# Phone: +971-XX-XXXXXXX

# 4. Preserve logs
tar -czf incident-logs-$(date +%Y%m%d).tar.gz /var/log/

# 5. Document everything
# Take screenshots, note times
```

**Recovery Steps:**

```bash
# 1. Assess damage
# Which systems are affected?
# Are backups intact?

# 2. Verify backups are clean
# Check backups from before incident date
./scripts/backup/verify-backup.sh \
    /var/backups/maidar/maidar-production-YYYYMMDD-HHMMSS.sql.gz

# 3. Build new infrastructure
# Do NOT use potentially compromised infrastructure
terraform apply -auto-approve

# 4. Restore from clean backup
# Use backup from before breach
./scripts/backup/restore-database.sh <clean-backup> production

# 5. Security hardening
# Rotate all secrets
# Update all passwords
# Review access logs

# 6. Forensics
# Work with security team
# Identify attack vector
# Patch vulnerabilities
```

**Estimated Time:** 8-24 hours

---

### Scenario 5: Accidental Data Deletion

**Symptoms:**
- User reports missing data
- Audit logs show DELETE operation
- Data not in database

**Recovery Steps:**

```bash
# 1. Identify when data was deleted
# Check audit logs
psql -U postgres -d maidar -c \
    "SELECT * FROM audit_logs WHERE action LIKE '%DELETE%' ORDER BY created_at DESC LIMIT 10;"

# 2. Find backup from before deletion
# List backups
ls -lh /var/backups/maidar/

# 3. Restore to temporary database
createdb maidar_recovery
pg_restore -d maidar_recovery /var/backups/maidar/maidar-production-YYYYMMDD.sql.gz

# 4. Extract deleted data
pg_dump maidar_recovery -t specific_table --data-only > deleted_data.sql

# 5. Restore only deleted data to production
psql -U postgres -d maidar -f deleted_data.sql

# 6. Verify data restored
psql -U postgres -d maidar -c "SELECT * FROM specific_table WHERE id = 'deleted_id';"

# 7. Clean up
dropdb maidar_recovery

# 8. Notify user
# Data has been restored
```

**Estimated Time:** 30 minutes - 2 hours

---

## 3. Backup Verification

### Weekly Verification Test

```bash
# Every week, verify backups are restorable

# 1. Create test database
createdb maidar_test_restore

# 2. Restore latest backup
./scripts/backup/verify-backup.sh \
    $(ls -t /var/backups/maidar/*.sql.gz | head -1)

# 3. Check results
# Script will return 0 if successful
echo $?  # Should be 0

# 4. Document results
# Log to verification spreadsheet
```

---

## 4. Point-in-Time Recovery

### AWS RDS Automated Backups

If using RDS:

```bash
# 1. Identify restore point
# Use AWS Console or CLI

# 2. Restore to point in time
aws rds restore-db-instance-to-point-in-time \
    --source-db-instance-identifier maidar-production \
    --target-db-instance-identifier maidar-pitr-$(date +%Y%m%d) \
    --restore-time 2026-02-28T10:00:00Z

# 3. Wait for restore
aws rds wait db-instance-available \
    --db-instance-identifier maidar-pitr-$(date +%Y%m%d)

# 4. Update application connection string
# Point to new database

# 5. Verify data
# Check if deleted/corrupted data is absent

# 6. Switch production to restored instance
# Update DNS or connection strings
```

---

## 5. Testing Procedures

### Quarterly DR Drill

**Schedule:** Every 3 months
**Participants:** DevOps team, Backend team, QA team

**Drill Procedure:**

1. **Announce drill** - "This is a drill"
2. **Simulate failure** - Pick a scenario
3. **Execute recovery** - Follow procedures
4. **Time execution** - Measure against RTO
5. **Document results** - What worked, what didn't
6. **Update procedures** - Improve based on learnings

**Success Criteria:**
- [ ] Recovery completed within RTO (4 hours)
- [ ] Data loss within RPO (6 hours)
- [ ] All services operational
- [ ] Monitoring and alerts working
- [ ] Team comfortable with procedures

---

## 6. Emergency Contacts

### Escalation Matrix

| Role | Primary | Backup | Phone |
|------|---------|--------|-------|
| **CTO** | Name | Name | +971-XX-XXX |
| **DevOps Lead** | Name | Name | +971-XX-XXX |
| **Database Admin** | Name | Name | +971-XX-XXX |
| **Security Lead** | Name | Name | +971-XX-XXX |

### External Vendors

| Service | Contact | Support URL |
|---------|---------|-------------|
| **AWS Support** | Enterprise Support | https://console.aws.amazon.com/support |
| **Sentry** | support@sentry.io | https://sentry.io/support |
| **SendGrid** | support@sendgrid.com | https://support.sendgrid.com |

---

## 7. Communication Plan

### Internal Communication

**During Incident:**
- Slack: #maidar-incidents channel
- Update every 30 minutes
- Use incident severity levels (P1-P4)

**After Recovery:**
- Post-mortem meeting within 48 hours
- Document lessons learned
- Update runbooks

### Customer Communication

**During Incident:**
- Update status page: https://status.maidar.com
- Tweet from @MAIDAR_Status
- Email affected customers

**Template:**
```
Subject: MAIDAR Service Disruption Update

We are currently experiencing a service disruption affecting [service].

What happened: [Brief description]
Impact: [What users are affected]
Current status: [What we're doing]
ETA: [When we expect resolution]

We apologize for the inconvenience. Updates: https://status.maidar.com
```

---

## 8. Recovery Checklist

### Post-Recovery Verification

- [ ] Database restored and verified
- [ ] All services running (kubectl get pods)
- [ ] Health checks passing (curl /health)
- [ ] Monitoring active (Sentry, Grafana)
- [ ] Backups resuming normally
- [ ] DNS updated (if changed)
- [ ] SSL certificates valid
- [ ] External integrations working (SendGrid, Claude AI)
- [ ] User authentication working
- [ ] Test simulation launch
- [ ] Review logs for errors
- [ ] Monitor for 24 hours
- [ ] Document incident
- [ ] Schedule post-mortem

---

## 9. Backup Inventory

### Current Backups

```bash
# List all backups
./scripts/backup/list-backups.sh

# Output:
# Date                  Size    Location
# 2026-02-28 06:00     2.5GB   /var/backups/maidar/
# 2026-02-28 00:00     2.4GB   S3
# 2026-02-27 18:00     2.4GB   S3
# ...
```

### Off-Site Backups

- **S3 Primary:** s3://maidar-backups-production (me-south-1)
- **S3 DR:** s3://maidar-backups-dr (eu-central-1)
- **Glacier:** 90-day retention for compliance

---

## 10. Continuous Improvement

### Post-Incident Review

After every incident/drill:

1. **What happened?** - Timeline of events
2. **What went well?** - Celebrate successes
3. **What can improve?** - Action items
4. **Update procedures** - Incorporate learnings

### Metrics to Track

- **Mean Time to Detect (MTTD)** - How fast we notice
- **Mean Time to Recover (MTTR)** - How fast we fix
- **Recovery success rate** - % of successful recoveries
- **Backup success rate** - % of successful backups

---

## Quick Reference

### Restore Database
```bash
./scripts/backup/restore-database.sh <backup-file> production
```

### List Backups
```bash
ls -lh /var/backups/maidar/
aws s3 ls s3://maidar-backups-production/
```

### Verify Backup
```bash
./scripts/backup/verify-backup.sh <backup-file>
```

### Emergency Stop
```bash
kubectl scale deployment maidar-backend --replicas=0
```

### Emergency Start
```bash
kubectl scale deployment maidar-backend --replicas=3
```

---

**Last Updated:** 2026-02-28
**Next DR Drill:** Q2 2026
**Document Owner:** DevOps Team
