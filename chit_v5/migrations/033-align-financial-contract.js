'use strict';

module.exports = {
  async up(q, S) {
    const qi = q;
    const add = async (table, column, definition) => {
      try { await qi.addColumn(table, column, definition); } catch (e) {
        // Idempotent for environments where the column was already added manually.
      }
    };

    await add('chits','collection_grace_days',{type:S.INTEGER,allowNull:false,defaultValue:7});
    await add('chits','agent_commission_mode',{type:S.STRING(30),allowNull:false,defaultValue:'NONE'});
    await add('chits','auction_discount_distribution',{type:S.STRING(40),allowNull:false,defaultValue:'EQUAL_MEMBER_BENEFIT'});

    // Existing ledger migration exposes debit/credit columns while services use signed amount.
    await add('ledger_entries','amount',{type:S.DECIMAL(14,2),allowNull:true});
    await qi.sequelize.query(`
      UPDATE ledger_entries
      SET amount = COALESCE(credit_amount,0) - COALESCE(debit_amount,0)
      WHERE amount IS NULL
    `);

    await add('user_payment_profiles','user_id',{type:S.UUID,allowNull:true,references:{model:'users',key:'id'},onDelete:'CASCADE'});
    await add('user_payment_profiles','upi_id',{type:S.STRING(255),allowNull:true});
    await add('user_payment_profiles','bank_name',{type:S.STRING(150),allowNull:true});
    await add('user_payment_profiles','account_number',{type:S.STRING(100),allowNull:true});
    await add('user_payment_profiles','ifsc',{type:S.STRING(20),allowNull:true});
    await add('user_payment_profiles','cash_accepted',{type:S.BOOLEAN,allowNull:false,defaultValue:false});

    await add('user_roles','user_id',{type:S.UUID,allowNull:true,references:{model:'users',key:'id'},onDelete:'CASCADE'});
    await add('user_roles','role',{type:S.STRING(40),allowNull:true});
  },
  async down(q, S) {
    for (const [table,column] of [
      ['user_roles','role'],['user_roles','user_id'],
      ['user_payment_profiles','cash_accepted'],['user_payment_profiles','ifsc'],
      ['user_payment_profiles','account_number'],['user_payment_profiles','bank_name'],
      ['user_payment_profiles','upi_id'],['user_payment_profiles','user_id'],
      ['ledger_entries','amount'],
      ['chits','auction_discount_distribution'],['chits','agent_commission_mode'],
      ['chits','collection_grace_days']
    ]) {
      try { await q.removeColumn(table,column); } catch {}
    }
  }
};
