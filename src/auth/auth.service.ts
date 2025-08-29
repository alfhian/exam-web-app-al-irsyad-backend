import { Injectable, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  /**
   * Service to handle authentication logic.
   * It uses UsersService for user management and JwtService for JWT operations.
   */
  /**
   * Constructor for AuthService.
   * @param usersService - The service to manage user data.
   * @param jwtService - The service to handle JWT operations.
   */
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  private blacklistedTokens: Set<string> = new Set();
  /**
   * Blacklists a token by adding it to the set of blacklisted tokens.
   * @param token - The JWT token to blacklist.
   */

  blacklistToken(token: string) {
    this.blacklistedTokens.add(token);
    console.log('Token blacklisted:', token);
  }

  isTokenBlacklisted(token: string): boolean {
    return this.blacklistedTokens.has(token);
  }

  /**
   * Registers a new user.
   * @param dto - The registration data transfer object containing user details.
   * @returns A message indicating successful registration and the user details.
   */

  async register(dto: RegisterDto) {
    // Registration logic can be added here
    await this.usersService.createUser({
      userid: dto.userid,
      password: bcrypt.hashSync(dto.password, 10), // Hash the password before saving
      name: dto.name, 
      role: dto.role, 
      is_active: true, // Default to active
      created_at: new Date(), // Set the current date as created_at
      created_by: dto.created_by, 
    });

    const user = await this.usersService.getUserByNisNik(dto.userid);
    
    if (!user) {
      throw new InternalServerErrorException('User registration failed');
    }

    return {
      message: 'User berhasil didaftarkan',
      user: {
        userid: user.userid,
        name: user.name,
        role: user.role,
        is_active: user.is_active,
      },
    };
  }

  /**
   * Validates a user by checking their userid and password.
   * Throws UnauthorizedException if the user is not found, inactive, or if the password is incorrect.
   * @param userid - The user's ID.
   * @param password - The user's password.
   * @returns The user object without the password field if validation is successful.
   */

  async validateUser(id: string, password: string) {
    const user = await this.usersService.getUserByNisNik(id);
    
    if (!user) {
      throw new UnauthorizedException('User ID tidak terdaftar');
    }
    
    if (!user[0].is_active) {
      throw new UnauthorizedException('Akun tidak aktif');
    }

    const isPasswordValid = bcrypt.compareSync(password, user[0].password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Password salah');
    }

    const { password: _, ...safeUser } = user;
    
    return safeUser;
  }

  /**
   * Logs in a user by validating their credentials and generating a JWT token.
   * @param dto - The login data transfer object containing userid and password.
   * @returns An object containing the generated JWT token.
   */

  async login(dto: LoginDto) {
    const user = await this.validateUser(dto.userid, dto.password);

    console.log(user);
    

    const payload = {
      sub: user[0].id,
      userid: user[0].userid,
      role: user[0].role,
      name: user[0].name,
      is_active: user[0].is_active,
    };

    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}
