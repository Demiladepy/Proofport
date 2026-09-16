// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title ProofportReputationAttestation
/// @notice Minimal PII-free onchain reputation rail seed.
///         Stores only opaque hashes — never names, IDs, or claim values.
contract ReputationAttestation {
    struct Record {
        bytes32 subject;
        bytes32 kind;
        bytes32 evidenceHash;
        uint64 attestedAt;
        address attester;
    }

    mapping(bytes32 => Record) public records;
    bytes32[] public subjects;

    event Attested(
        bytes32 indexed subject,
        bytes32 indexed kind,
        bytes32 evidenceHash,
        address attester,
        uint64 attestedAt
    );

    function attest(
        bytes32 subject,
        bytes32 kind,
        bytes32 evidenceHash
    ) external returns (bytes32) {
        require(subject != bytes32(0), "subject");
        require(evidenceHash != bytes32(0), "evidence");
        uint64 ts = uint64(block.timestamp);
        if (records[subject].attestedAt == 0) {
            subjects.push(subject);
        }
        records[subject] = Record({
            subject: subject,
            kind: kind,
            evidenceHash: evidenceHash,
            attestedAt: ts,
            attester: msg.sender
        });
        emit Attested(subject, kind, evidenceHash, msg.sender, ts);
        return subject;
    }

    function getAttestation(
        bytes32 subject
    )
        external
        view
        returns (
            bytes32 kind,
            bytes32 evidenceHash,
            uint64 attestedAt,
            address attester
        )
    {
        Record memory r = records[subject];
        return (r.kind, r.evidenceHash, r.attestedAt, r.attester);
    }

    function subjectCount() external view returns (uint256) {
        return subjects.length;
    }
}
